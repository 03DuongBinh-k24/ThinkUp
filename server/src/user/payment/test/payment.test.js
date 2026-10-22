import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPaymentSession,
  checkPaymentStatus,
  fulfillPaymentSuccess,
  PAYMENT_EXPIRY_MS,
} from '../payment.service.js';
import { handleSepayWebhook } from '../gateways/sepay.service.js';
import { createVnpayPaymentUrl } from '../gateways/vnpay.service.js';
import { getMongoDb } from '../../db.js';

test('Kiểm tra Module Thanh Toán Toàn Diện (Payment Module)', async (t) => {
  const db = await getMongoDb();
  const testUserId = 'test_user_payment_flow';
  const testCourses = [
    {
      id: 'course_ai_01',
      title: 'Khóa học AI Toàn Diện',
      price: 499000,
      salePrice: 499000,
      originalPrice: 999000,
      instructor: 'Dr. John Doe',
    },
  ];

  let createdSession = null;

  await t.test('1. Tạo phiên thanh toán mới (TTL 15 phút, sinh mã DH & GD)', async () => {
    createdSession = await createPaymentSession({
      userId: testUserId,
      courses: testCourses,
      paymentMethod: 'bank-transfer',
    });

    assert.ok(createdSession.orderId.startsWith('DH'), 'Order ID phải có tiền tố DH');
    assert.ok(createdSession.transactionId.startsWith('GD'), 'Transaction ID phải có tiền tố GD');
    assert.equal(createdSession.amount, 499000, 'Số tiền thanh toán phải bằng tổng học phí');
    assert.equal(createdSession.expiresInSeconds, 900, 'Thời gian đếm ngược phải là 900 giây (15 phút)');
    assert.ok(createdSession.qrCodeUrl.includes('https://qr.sepay.vn'), 'Phải tạo link QR SePay chuẩn');
  });

  await t.test('2. Kiểm tra trạng thái và đồng hồ đếm ngược 15 phút', async () => {
    const tx = await checkPaymentStatus(createdSession.transactionId);
    assert.equal(tx.status, 'pending', 'Trạng thái ban đầu phải là pending');
    assert.equal(tx.amount, 499000);
  });

  await t.test('3. Tạo URL thanh toán VNPay Sandbox với mã giao dịch GD...', () => {
    const vnpUrl = createVnpayPaymentUrl({
      transactionId: createdSession.transactionId,
      amount: createdSession.amount,
      orderInfo: `Thanh toan don hang ${createdSession.orderId}`,
    });

    assert.ok(vnpUrl.includes('vnp_TxnRef=' + createdSession.transactionId));
    assert.ok(vnpUrl.includes('vnp_SecureHash='));
  });

  await t.test('4. Webhook SePay mô phỏng tiền về và tự động kích hoạt khóa học', async () => {
    const sepayPayload = {
      id: 1234567,
      gateway: 'MBBank',
      transactionDate: '2026-10-21 08:35:00',
      accountNumber: '0000000001',
      content: `THINKUP ${createdSession.transactionId} chuyen tien hoc phi`,
      transferType: 'in',
      transferAmount: 499000,
    };

    const webhookKey = process.env.SEPAY_WEBHOOK_KEY || 'ThinkUp_Secret_2026';
    const authHeader = `Apikey ${webhookKey}`;
    const webhookResult = await handleSepayWebhook(sepayPayload, authHeader);
    assert.equal(webhookResult.success, true);

    // Kiểm tra trong CSDL: payment_transactions chuyển thành success
    const updatedTx = await db.collection('payment_transactions').findOne({
      transaction_id: createdSession.transactionId,
    });
    assert.equal(updatedTx.status, 'success');
    assert.ok(updatedTx.paid_at, 'Phải có thời gian thanh toán paid_at');

    // Kiểm tra trong CSDL: Khóa học đã được mở khóa trong user_courses
    const enrollment = await db.collection('user_courses').findOne({
      user_id: testUserId,
      course_id: 'course_ai_01',
    });
    assert.ok(enrollment, 'Học viên phải được ghi danh vào user_courses');
    assert.equal(enrollment.status, 'active');
  });

  await t.test('5. Idempotency: Webhook bắn lại lần 2 không gây lỗi hay trùng lặp', async () => {
    const sepayPayload = {
      id: 1234567,
      transferType: 'in',
      transferAmount: 499000,
      content: `THINKUP ${createdSession.transactionId}`,
    };

    const webhookKey = process.env.SEPAY_WEBHOOK_KEY || 'ThinkUp_Secret_2026';
    const authHeader = `Apikey ${webhookKey}`;
    const secondResult = await handleSepayWebhook(sepayPayload, authHeader);
    assert.equal(secondResult.success, true);
    assert.ok(secondResult.message.includes('trước đó'));
  });

  // Dọn dẹp dữ liệu test
  await Promise.all([
    db.collection('orders').deleteMany({ user_id: testUserId }),
    db.collection('payment_transactions').deleteMany({ user_id: testUserId }),
    db.collection('user_courses').deleteMany({ user_id: testUserId }),
  ]);
});
