/**
 * Module Dịch Vụ Thanh Toán & Kích Hoạt Đơn Hàng (Payment Fulfillment Service)
 *
 * Thực hiện toàn bộ quy trình hoàn tất thanh toán chuẩn tài chính & nghiệp vụ ThinkUp:
 * 1. Khởi tạo đơn hàng & phiên giao dịch (Order TTL 15 phút, trạng thái 'pending').
 * 2. Tự động kiểm tra / hủy các đơn đã quá 15 phút chưa thanh toán sang 'expired'.
 * 3. Xử lý thanh toán thành công (Idempotency chống trùng):
 *    - Cập nhật payment_transactions thành 'success' và ghi nhận thời gian hoàn tất.
 *    - Cập nhật order thành 'completed'.
 *    - Tự động mở khóa quyền truy cập bài học (ghi vào user_courses / enrolled_courses).
 *    - Tự động dọn các khóa đã mua ra khỏi giỏ hàng của học viên (cart).
 *    - Tự động phát hành hóa đơn điện tử & gửi email biên lai thanh toán.
 */

import { ObjectId } from 'mongodb';
import { getMongoDb, sendEmail } from '../db.js';
import { generateOrderWithTransaction } from '../order/order-id.user.js';
import { renderPaymentReceiptEmail } from '../email/receipt-template.js';

// ─── 0. Hằng Số Nghiệp Vụ ────────────────────────────────────────────────────

export const COLLECTION_TRANSACTIONS = 'payment_transactions';
export const COLLECTION_ORDERS = 'orders';
export const COLLECTION_USER_COURSES = 'user_courses';
export const COLLECTION_CARTS = 'carts';
export const COLLECTION_USERS = 'users';

/** Thời gian hết hạn phiên thanh toán: 15 phút (ms) */

/**
 * Tạo phiên thanh toán mới cho người dùng với TTL 15 phút.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {Array<{id: string, title: string, price: number, thumbnail?: string, instructorName?: string}>} params.courses
 * @param {string} params.paymentMethod - 'sepay' | 'vnpay' | 'stripe' | 'bank-transfer' | v.v.
 * @param {string} [params.customTransferContent]
 * @returns {Promise<{ orderId: string, transactionId: string, amount: number, expiresAt: Date, paymentUrl?: string, qrCodeUrl?: string }>}
 */
export async function createPaymentSession({
  userId,
  courses = [],
  paymentMethod = 'bank-transfer',
  customTransferContent = '',
  voucherCode = '',
  voucherDiscount = 0,
}) {
  if (!courses || courses.length === 0) {
    const error = new Error('Danh sách khóa học không được để trống khi thanh toán');
    error.status = 400;
    throw error;
  }

  const db = await getMongoDb();
  const { orderId, transactionId } = await generateOrderWithTransaction();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + PAYMENT_EXPIRY_MS);

  // Tính toán số tiền:
  // subtotalOriginal: tổng giá gốc ban đầu của các khóa học
  // saleSubtotal: tổng giá sau khi giảm giá khóa học
  // totalAmount: sau khi trừ voucher (nếu có)
  const subtotalOriginal = courses.reduce((sum, c) => sum + (Number(c.originalPrice || c.price || c.salePrice) || 0), 0);
  const saleSubtotal = courses.reduce((sum, c) => sum + (Number(c.salePrice ?? c.price) || 0), 0);
  const discountVoucher = Math.max(0, Number(voucherDiscount) || 0);
  const totalAmount = Math.max(0, saleSubtotal - discountVoucher);

  const transferContent = customTransferContent || `THINKUP ${transactionId}`;

  // Chuẩn bị thông tin lưu CSDL
  const orderDoc = {
    order_id: orderId,
    user_id: String(userId),
    courses: courses.map((c) => ({
      id: String(c.id),
      title: c.displayTitle || c.title,
      price: Number(c.salePrice ?? c.price ?? 0),
      original_price: Number(c.originalPrice || c.price || c.salePrice || 0),
      thumbnail: c.thumbnail || c.thumbnail_url || '',
      thumbnail_url: c.thumbnail || c.thumbnail_url || '',
      instructor: c.instructorName || c.instructor || 'ThinkUp Mentor',
    })),
    subtotal: subtotalOriginal,
    sale_subtotal: saleSubtotal,
    voucher_code: voucherCode || '',
    voucher_discount: discountVoucher,
    discount: (subtotalOriginal - saleSubtotal) + discountVoucher,
    total: totalAmount,
    currency: 'VND',
    status: 'pending', // 'pending' | 'completed' | 'expired' | 'cancelled'
    created_at: now,
    expires_at: expiresAt,
  };

  const transactionDoc = {
    transaction_id: transactionId,
    order_id: orderId,
    user_id: String(userId),
    payment_method: paymentMethod,
    amount: totalAmount,
    currency: 'VND',
    status: 'pending', // 'pending' | 'success' | 'failed' | 'expired'
    transfer_content: transferContent,
    payment_content: `Thanh toan khoa hoc don hang ${orderId}`,
    created_at: now,
    expires_at: expiresAt,
    paid_at: null,
    order_summary: JSON.stringify({
      courses: orderDoc.courses,
      subtotal: subtotalOriginal,
      sale_subtotal: saleSubtotal,
      voucher_code: voucherCode || '',
      voucher_discount: discountVoucher,
      total: totalAmount,
    }),
  };

  await Promise.all([
    db.collection(COLLECTION_ORDERS).insertOne(orderDoc),
    db.collection(COLLECTION_TRANSACTIONS).insertOne(transactionDoc),
  ]);

  // Sinh thông tin VietQR nếu là phương thức SePay / Chuyển khoản
  let qrCodeUrl = '';
  const bankId = process.env.SEPAY_BANK_ID || 'MB';
  const accountNo = process.env.SEPAY_ACCOUNT_NO || '0000000001';
  const accountName = encodeURIComponent(process.env.BANK_ACCOUNT_HOLDER || 'CONG TY THINKUP');
  qrCodeUrl = `https://qr.sepay.vn/img?acc=${accountNo}&bank=${bankId}&amount=${totalAmount}&des=${encodeURIComponent(transferContent)}&template=compact`;

  return {
    orderId,
    transactionId,
    amount: totalAmount,
    currency: 'VND',
    expiresAt,
    expiresInSeconds: Math.floor(PAYMENT_EXPIRY_MS / 1000),
    paymentMethod,
    transferContent,
    bankInfo: {
      bankId,
      accountNo,
      accountName: process.env.BANK_ACCOUNT_HOLDER || 'CONG TY THINKUP',
    },
    qrCodeUrl,
  };
}

// ─── 2. Kiểm Tra Hết Hạn Đơn Hàng (Order TTL Enforcement) ─────────────────────

/**
 * Kiểm tra trạng thái phiên thanh toán và tự động cập nhật sang 'expired' nếu đã qua 15 phút.
 *
 * @param {string} transactionId
 * @returns {Promise<object>} Transaction document
 */
export async function checkPaymentStatus(transactionId) {
  const db = await getMongoDb();
  const tx = await db.collection(COLLECTION_TRANSACTIONS).findOne({ transaction_id: transactionId });

  if (!tx) {
    const error = new Error('Giao dịch không tồn tại');
    error.status = 404;
    throw error;
  }

  // Nếu đang pending mà đã quá thời hạn 15 phút -> Tự động chuyển thành 'expired'
  if (tx.status === 'pending' && tx.expires_at && new Date() > new Date(tx.expires_at)) {
    await Promise.all([
      db.collection(COLLECTION_TRANSACTIONS).updateOne(
        { transaction_id: transactionId, status: 'pending' },
        { $set: { status: 'expired', updated_at: new Date() } }
      ),
      db.collection(COLLECTION_ORDERS).updateOne(
        { order_id: tx.order_id, status: 'pending' },
        { $set: { status: 'expired', updated_at: new Date() } }
      ),
    ]);
    tx.status = 'expired';
  }

  return tx;
}

// ─── 3. Hoàn Tất Thanh Toán (Fulfillment - Nghiệp vụ then chốt) ────────────────

/**
 * Xử lý hoàn tất giao dịch thanh toán thành công (Bảo đảm Idempotency):
 * - Cập nhật trạng thái CSDL.
 * - Mở khóa bài học ngay.
 * - Dọn giỏ hàng.
 * - Gửi email biên lai & phát hành hóa đơn điện tử.
 *
 * @param {object} params
 * @param {string} params.transactionId - Mã GD (GD...)
 * @param {string} [params.gatewayTransactionNo] - Mã tham chiếu từ cổng thanh toán (nếu có)
 * @param {number} [params.paidAmount] - Số tiền thực nhận
 * @param {object} [params.gatewayPayload] - Dữ liệu raw webhook/callback để tra soát
 * @returns {Promise<{ success: boolean, alreadyProcessed: boolean, orderId: string }>}
 */
export async function fulfillPaymentSuccess({
  transactionId,
  gatewayTransactionNo = '',
  paidAmount,
  gatewayPayload = {},
}) {
  const db = await getMongoDb();

  // 1. Kiểm tra tồn tại
  const tx = await db.collection(COLLECTION_TRANSACTIONS).findOne({ transaction_id: transactionId });
  if (!tx) {
    throw new Error(`Không tìm thấy giao dịch: ${transactionId}`);
  }

  // Idempotency: Nếu đã thành công trước đó thì không làm lại (tránh webhook bắn 2-3 lần)
  if (tx.status === 'success') {
    return { success: true, alreadyProcessed: true, orderId: tx.order_id };
  }

  const now = new Date();
  const paidTime = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  // 2. Cập nhật transaction sang success (Atomic findOneAndUpdate)
  const updateResult = await db.collection(COLLECTION_TRANSACTIONS).findOneAndUpdate(
    { transaction_id: transactionId, status: { $ne: 'success' } },
    {
      $set: {
        status: 'success',
        paid_at: paidTime,
        updated_at: now,
        gateway_transaction_no: gatewayTransactionNo,
        actual_paid_amount: paidAmount || tx.amount,
        webhook_log: gatewayPayload,
      },
    },
    { returnDocument: 'after' }
  );

  if (!updateResult) {
    // Đã được tiến trình khác xử lý xong
    return { success: true, alreadyProcessed: true, orderId: tx.order_id };
  }

  // 3. Cập nhật đơn hàng (Order) sang 'completed'
  await db.collection(COLLECTION_ORDERS).updateOne(
    { order_id: tx.order_id },
    {
      $set: {
        status: 'completed',
        paid_at: now,
        updated_at: now,
      },
    }
  );

  // Parse tóm tắt đơn hàng để lấy danh sách khóa học
  let courses = [];
  try {
    const summary = typeof tx.order_summary === 'string' ? JSON.parse(tx.order_summary) : tx.order_summary;
    courses = summary?.courses || [];
  } catch (e) {
    console.error('[Fulfillment] Parse order_summary error:', e);
  }

  const courseIds = courses.map((c) => String(c.id));
  const userId = tx.user_id;

  // 4. Mở khóa quyền truy cập bài học (Ghi vào collection user_courses)
  if (courseIds.length > 0 && userId) {
    const enrollmentOps = courses.map((c) => ({
      updateOne: {
        filter: { user_id: String(userId), course_id: String(c.id) },
        update: {
          $set: {
            user_id: String(userId),
            course_id: String(c.id),
            title: c.title,
            enrolled_at: now,
            order_id: tx.order_id,
            transaction_id: tx.transaction_id,
            progress: 0,
            status: 'active',
          },
        },
        upsert: true,
      },
    }));

    await db.collection(COLLECTION_USER_COURSES).bulkWrite(enrollmentOps);
  }

  // 5. Tự động dọn các khóa đã mua ra khỏi giỏ hàng
  if (courseIds.length > 0 && userId) {
    try {
      await db.collection(COLLECTION_CARTS).updateOne(
        { user_id: String(userId) },
        { $pull: { items: { id: { $in: courseIds } } } }
      );
    } catch (cartErr) {
      console.warn('[Fulfillment] Clear cart warning:', cartErr.message);
    }
  }

  // 6. Gửi email biên lai & phát hành hóa đơn điện tử
  let userEmail = '';
  let userName = 'Học viên';
  try {
    let user = null;
    if (ObjectId.isValid(userId)) {
      user = await db.collection(COLLECTION_USERS).findOne({ _id: new ObjectId(userId) });
    } else {
      user = await db.collection(COLLECTION_USERS).findOne({ email: userId });
    }
    if (user) {
      userEmail = user.email;
      userName = user.full_name || user.name || 'Học viên';
    }
  } catch (uErr) {
    console.warn('[Fulfillment] Get user email warning:', uErr.message);
  }

  if (userEmail) {
    try {
      const emailHtml = renderPaymentReceiptEmail({
        userName,
        orderId: tx.order_id,
        transactionId: tx.transaction_id,
        paymentMethod: tx.payment_method || 'Chuyển khoản trực tiếp',
        totalAmount: tx.amount,
        courses,
        paidAt: paidTime,
        clientUrl: process.env.CLIENT_URL,
      });

      sendEmail({
        to: userEmail,
        subject: `[ThinkUp] Biên lai thanh toán thành công đơn hàng ${tx.order_id}`,
        html: emailHtml,
        text: `Thanh toán thành công đơn hàng ${tx.order_id}. Tổng số tiền: ${tx.amount}đ.`,
      }).catch((mailErr) => console.error('[Fulfillment] Send email async error:', mailErr));
    } catch (mailBuildErr) {
      console.error('[Fulfillment] Build email error:', mailBuildErr);
    }
  }

  return {
    success: true,
    alreadyProcessed: false,
    orderId: tx.order_id,
    transactionId: tx.transaction_id,
    coursesCount: courses.length,
  };
}
