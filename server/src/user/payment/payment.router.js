/**
 * Router API Thanh Toán Toàn Diện (Payment API Router)
 *
 * Hỗ trợ các endpoints:
 * 1. POST /create-session    : Khởi tạo phiên thanh toán (Order TTL 15 phút, sinh VietQR hoặc URL thanh toán)
 * 2. GET  /status/:id        : Kiểm tra trạng thái giao dịch (Front-end polling / countdown 15 phút)
 * 3. POST /webhook/sepay     : Hứng tín hiệu biến động số dư VietQR từ SePay (tự động kích hoạt)
 * 4. GET  /vnpay/callback    : Hứng kết quả Return URL từ VNPay
 * 5. GET  /vnpay/ipn         : Hứng Webhook IPN từ máy chủ VNPay
 * 6. POST /webhook/stripe    : Hứng Stripe Webhook thanh toán quốc tế
 */

import {
  createPaymentSession,
  checkPaymentStatus,
  fulfillPaymentSuccess,
} from './payment.service.js';
import { handleSepayWebhook } from './gateways/sepay.service.js';
import { createVnpayPaymentUrl, verifyVnpayCallback } from './gateways/vnpay.service.js';
import { createStripeCheckoutSession, handleStripeWebhookEvent } from './gateways/stripe.service.js';

/**
 * Khởi tạo Payment Router
 *
 * @param {import('express')} express
 * @param {Function} requireAuth
 * @returns {import('express').Router}
 */
export function createPaymentRouter(express, requireAuth) {
  const router = express.Router();

  // ─── 1. Khởi Tạo Phiên Thanh Toán (Checkout) ───────────────────────────────
  // Yêu cầu đăng nhập tài khoản học viên (JWT)
  router.post('/create-session', requireAuth, async (req, res, next) => {
    try {
      const { courses, paymentMethod, bankCode, voucherCode, voucherDiscount } = req.body;
      const userId = req.userId;

      // Tạo session nội bộ (Order + Transaction TTL 15 phút)
      const session = await createPaymentSession({
        userId,
        courses,
        paymentMethod: paymentMethod || 'bank-transfer',
        voucherCode,
        voucherDiscount,
      });

      // Tùy từng cổng mà tạo thêm paymentUrl chuyển hướng:
      if (paymentMethod === 'vnpay' || paymentMethod === 'atm') {
        const ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
        const vnpUrl = createVnpayPaymentUrl({
          transactionId: session.transactionId,
          amount: session.amount,
          orderInfo: `Thanh toan don hang ${session.orderId}`,
          ipAddr: Array.isArray(ipAddr) ? ipAddr[0] : ipAddr.split(',')[0],
          bankCode,
        });
        session.paymentUrl = vnpUrl;
      } else if (paymentMethod === 'stripe' || paymentMethod === 'international') {
        try {
          const stripeSession = await createStripeCheckoutSession({
            transactionId: session.transactionId,
            orderId: session.orderId,
            amount: session.amount,
            courses,
          });
          session.paymentUrl = stripeSession.url;
        } catch (stErr) {
          console.warn('[Stripe] Warning create session:', stErr.message);
          // Vẫn trả về session để client biết lỗi hoặc fallback
        }
      }

      res.status(201).json({
        success: true,
        message: 'Khởi tạo phiên thanh toán thành công (Hết hạn sau 15 phút)',
        data: session,
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── 2. Kiểm Tra Trạng Thái Đơn Hàng (Polling/Status check) ─────────────────
  router.get('/status/:id', async (req, res, next) => {
    try {
      const transactionId = req.params.id;
      const tx = await checkPaymentStatus(transactionId);

      const now = new Date();
      const expiresAt = tx.expires_at ? new Date(tx.expires_at) : null;
      const remainingSeconds = expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000)) : 0;

      res.json({
        success: true,
        transactionId: tx.transaction_id,
        orderId: tx.order_id,
        status: tx.status, // 'pending' | 'success' | 'expired' | 'failed'
        amount: tx.amount,
        paidAt: tx.paid_at,
        expiresAt: tx.expires_at,
        remainingSeconds,
      });
    } catch (err) {
      next(err);
    }
  });

  // ─── 3. Webhook SePay (VietQR Chuyển Khoản Tự Động) ─────────────────────────
  // SePay gọi sang khi có tiền chuyển vào tài khoản
  router.post('/webhook/sepay', async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const payload = req.body;

      const result = await handleSepayWebhook(payload, authHeader);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // ─── 4. VNPay Callbacks & IPN ──────────────────────────────────────────────
  // VNPay Return URL (trình duyệt redirect về)
  router.get('/vnpay/callback', async (req, res, next) => {
    try {
      const result = await verifyVnpayCallback(req.query);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
      const redirectUrl = `${clientUrl}/main/checkout/result?transaction_id=${req.query.vnp_TxnRef}&status=${result.isSuccess ? 'success' : 'failed'}&code=${result.code}`;
      res.redirect(redirectUrl);
    } catch (err) {
      next(err);
    }
  });

  // VNPay IPN (Server to Server Webhook)
  router.get('/vnpay/ipn', async (req, res) => {
    try {
      const result = await verifyVnpayCallback(req.query);
      if (result.isSuccess) {
        res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
      } else {
        res.status(200).json({ RspCode: result.code || '99', Message: result.message });
      }
    } catch (err) {
      res.status(200).json({ RspCode: '99', Message: err.message || 'Unknown error' });
    }
  });

  // ─── 5. Stripe Webhook (Quốc Tế, Apple Pay, Google Pay, PayPal) ────────────
  router.post('/webhook/stripe', async (req, res, next) => {
    try {
      const event = req.body;
      const result = await handleStripeWebhookEvent(event);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // ─── 6. Endpoint Mô Phỏng Thanh Toán Nhanh Cho Demo / Đồ Án ────────────────
  // Yêu cầu đăng nhập xác thực học viên
  router.post('/simulate-success', requireAuth, async (req, res, next) => {
    try {
      const { transactionId } = req.body;
      if (!transactionId) {
        return res.status(400).json({ message: 'Thiếu transactionId' });
      }
      const result = await fulfillPaymentSuccess({
        transactionId,
        gatewayTransactionNo: `SIMULATED_${Date.now()}`,
      });
      res.json({
        success: true,
        message: 'Mô phỏng thanh toán thành công và đã kích hoạt toàn bộ dịch vụ',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
