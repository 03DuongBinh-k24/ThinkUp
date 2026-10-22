/**
 * Cổng Thanh Toán SePay (Chuyển khoản VietQR tự động)
 *
 * Nhiệm vụ:
 * 1. Khởi tạo mã VietQR theo chuẩn Napas 247.
 * 2. Xử lý Webhook biến động số dư từ SePay:
 *    - Xác thực API Token (Header Authorization: Apikey <SEPAY_WEBHOOK_KEY>).
 *    - Trích xuất mã giao dịch 'GD...' từ nội dung chuyển khoản (content).
 *    - Đối soát số tiền chuyển vào so với giá trị đơn hàng.
 *    - Gọi fulfillPaymentSuccess() để tự động kích hoạt khóa học & dọn giỏ hàng & gửi hóa đơn.
 */

import { fulfillPaymentSuccess, checkPaymentStatus } from '../payment.service.js';

/**
 * Xử lý webhook từ SePay khi có biến động số dư tài khoản ngân hàng.
 *
 * @param {object} payload - Body từ SePay gửi sang
 * @param {string} [authHeader] - Header 'authorization' từ request
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function handleSepayWebhook(payload, authHeader = '') {
  // 1. Kiểm tra xác thực Token bảo mật (nếu có cấu hình SEPAY_WEBHOOK_KEY)
  const webhookKey = process.env.SEPAY_WEBHOOK_KEY;
  if (webhookKey) {
    const isAuthorized =
      authHeader.includes(webhookKey) ||
      authHeader === `Apikey ${webhookKey}` ||
      authHeader === `Bearer ${webhookKey}`;

    if (!isAuthorized) {
      const err = new Error('Không được phép (Invalid SePay Webhook Token)');
      err.status = 401;
      throw err;
    }
  }

  // 2. Trích xuất thông tin giao dịch từ SePay Payload
  // SePay thường gửi:
  // {
  //   "id": 92704,
  //   "gateway": "MBBank",
  //   "transactionDate": "2026-10-21 08:30:00",
  //   "accountNumber": "0000000001",
  //   "code": null,
  //   "content": "THINKUP GD2026102100000001 chuyen tien",
  //   "transferType": "in",
  //   "transferAmount": 499000,
  //   "accumulated": 10499000,
  //   "subAccount": null,
  //   "referenceCode": "MB123456"
  // }
  const content = String(payload.content || payload.description || '');
  const transferType = payload.transferType || payload.type || 'in';
  const transferAmount = Number(payload.transferAmount || payload.amount || 0);

  // Chỉ xử lý giao dịch tiền vào (in)
  if (transferType !== 'in') {
    return { success: true, message: 'Bỏ qua giao dịch chuyển tiền ra' };
  }

  // 3. Tìm mã giao dịch GD{YYYYMMDD}{SEQ8} trong nội dung chuyển khoản
  const match = content.match(/GD\d{16}/i);
  if (!match) {
    return {
      success: false,
      message: 'Không tìm thấy mã giao dịch GD... trong nội dung chuyển tiền',
    };
  }

  const transactionId = match[0].toUpperCase();

  // 4. Kiểm tra trạng thái giao dịch & thời hạn 15 phút
  const currentTx = await checkPaymentStatus(transactionId);
  if (currentTx.status === 'expired') {
    return {
      success: false,
      message: `Giao dịch ${transactionId} đã hết hạn (quá 15 phút)`,
    };
  }

  // 5. Kiểm tra số tiền nhận được so với số tiền cần thanh toán
  if (transferAmount < currentTx.amount) {
    console.warn(`[SePay Webhook] Giao dịch ${transactionId} thiếu tiền: Cần ${currentTx.amount}, nhận ${transferAmount}`);
    return {
      success: false,
      message: `Số tiền thanh toán không đủ (Cần: ${currentTx.amount}, Nhận: ${transferAmount})`,
    };
  }

  // 6. Hoàn tất đơn hàng & kích hoạt khóa học
  const result = await fulfillPaymentSuccess({
    transactionId,
    gatewayTransactionNo: String(payload.id || payload.referenceCode || ''),
    paidAmount: transferAmount,
    gatewayPayload: payload,
  });

  return {
    success: true,
    message: result.alreadyProcessed
      ? 'Giao dịch đã được kích hoạt trước đó'
      : 'Thanh toán thành công và đã kích hoạt khóa học',
    orderId: result.orderId,
  };
}
