/**
 * Cổng Thanh Toán Stripe Sandbox (Quốc tế: Visa, MasterCard, Apple Pay, Google Pay, PayPal)
 *
 * Nhiệm vụ:
 * 1. Khởi tạo Stripe Checkout Session hoặc PaymentIntent.
 * 2. Xử lý Stripe Webhook:
 *    - Xác thực signature Stripe `stripe-signature` với `STRIPE_WEBHOOK_SECRET`.
 *    - Lắng nghe event `checkout.session.completed` hoặc `payment_intent.succeeded`.
 *    - Gọi fulfillPaymentSuccess() để tự động kích hoạt khóa học & dọn giỏ hàng & gửi hóa đơn.
 */

import { fulfillPaymentSuccess, checkPaymentStatus } from '../payment.service.js';

/**
 * Khởi tạo Stripe Checkout Session thông qua Stripe REST API trực tiếp
 * (Không bắt buộc cài thêm thư viện npm nặng, dùng trực tiếp REST API của Stripe)
 *
 * @param {object} params
 * @param {string} params.transactionId
 * @param {string} params.orderId
 * @param {number} params.amount - Số tiền VND
 * @param {Array<{title: string, price: number}>} params.courses
 * @param {string} [params.customerEmail]
 * @returns {Promise<{ sessionId: string, url: string }>}
 */
export async function createStripeCheckoutSession({
  transactionId,
  orderId,
  amount,
  courses = [],
  customerEmail = '',
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Chưa cấu hình STRIPE_SECRET_KEY trong file .env');
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:4200';
  const successUrl = `${clientUrl}/main/checkout/result?session_id={CHECKOUT_SESSION_ID}&transaction_id=${transactionId}&status=success`;
  const cancelUrl = `${clientUrl}/main/checkout/result?transaction_id=${transactionId}&status=cancelled`;

  // Chuẩn bị line items cho Stripe
  const params = new URLSearchParams();
  params.append('payment_method_types[0]', 'card');
  params.append('payment_method_types[1]', 'paypal'); // Bật cả PayPal qua Stripe
  params.append('mode', 'payment');
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  params.append('client_reference_id', transactionId);
  params.append('metadata[orderId]', orderId);
  params.append('metadata[transactionId]', transactionId);

  if (customerEmail) {
    params.append('customer_email', customerEmail);
  }

  // Stripe VND là zero-decimal (không nhân 100)
  if (courses.length > 0) {
    courses.forEach((course, index) => {
      params.append(`line_items[${index}][price_data][currency]`, 'vnd');
      params.append(`line_items[${index}][price_data][product_data][name]`, course.title || 'Khóa học ThinkUp');
      params.append(`line_items[${index}][price_data][unit_amount]`, String(Math.round(course.price || course.salePrice || amount)));
      params.append(`line_items[${index}][quantity]`, '1');
    });
  } else {
    params.append('line_items[0][price_data][currency]', 'vnd');
    params.append('line_items[0][price_data][product_data][name]', `Đơn hàng ThinkUp #${orderId}`);
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(amount)));
    params.append('line_items[0][quantity]', '1');
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await response.json();
  if (!response.ok) {
    throw new Error(session.error?.message || 'Không thể tạo phiên thanh toán Stripe');
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Xử lý webhook từ Stripe khi thanh toán quốc tế thành công
 *
 * @param {object} event - Stripe Event Object
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function handleStripeWebhookEvent(event) {
  const eventType = event.type;

  if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
    const object = event.data?.object || {};
    const transactionId = object.client_reference_id || object.metadata?.transactionId;

    if (!transactionId) {
      return { success: false, message: 'Không tìm thấy transactionId trong metadata Stripe event' };
    }

    // Kiểm tra hết hạn
    const currentTx = await checkPaymentStatus(transactionId);
    if (currentTx.status === 'expired') {
      return { success: false, message: `Giao dịch ${transactionId} đã quá hạn 15 phút` };
    }

    const paidAmount = Number(object.amount_total || object.amount || 0);

    const result = await fulfillPaymentSuccess({
      transactionId,
      gatewayTransactionNo: object.id,
      paidAmount: paidAmount > 0 ? paidAmount : currentTx.amount,
      gatewayPayload: event,
    });

    return {
      success: true,
      message: 'Kích hoạt đơn hàng thành công từ Stripe Webhook',
      orderId: result.orderId,
    };
  }

  return { success: true, message: `Bỏ qua sự kiện Stripe: ${eventType}` };
}
