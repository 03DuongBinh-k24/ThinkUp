/**
 * Cổng Thanh Toán VNPay Sandbox
 *
 * Nhiệm vụ:
 * 1. Khởi tạo URL chuyển hướng sang cổng VNPay với chữ ký số HMAC-SHA512.
 * 2. Xử lý IPN Webhook và Return URL:
 *    - Xác thực kiểm tra toàn vẹn dữ liệu (vnp_SecureHash).
 *    - Kiểm tra mã kết quả giao dịch (vnp_ResponseCode === '00' & vnp_TransactionStatus === '00').
 *    - Gọi fulfillPaymentSuccess() hoàn tất đơn hàng.
 */

import crypto from 'crypto';
import { fulfillPaymentSuccess, checkPaymentStatus } from '../payment.service.js';

/**
 * Sắp xếp các tham số URL theo thứ tự bảng chữ cái để tạo chuỗi băm VNPay chuẩn
 */
function sortObject(obj) {
  const sorted = {};
  const str = [];
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

/**
 * Tạo URL thanh toán VNPay Sandbox
 *
 * @param {object} params
 * @param {string} params.transactionId
 * @param {number} params.amount
 * @param {string} params.orderInfo
 * @param {string} [params.ipAddr]
 * @param {string} [params.bankCode] - Tùy chọn (NCB, VNPAYQR, VISA...)
 * @returns {string} vnpayPaymentUrl
 */
export function createVnpayPaymentUrl({
  transactionId,
  amount,
  orderInfo,
  ipAddr = '127.0.0.1',
  bankCode = '',
}) {
  const tmnCode = process.env.VNP_TMN_CODE || process.env.VNPAY_TMN_CODE || 'DEMO';
  const secretKey = process.env.VNP_HASH_SECRET || process.env.VNPAY_HASH_SECRET || 'DEMO_SECRET';
  const vnpUrl = process.env.VNP_URL || process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = process.env.VNP_RETURN_URL || process.env.VNPAY_RETURN_URL || 'http://localhost:4200/main/checkout/result';

  const date = new Date();
  const createDate = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join('');

  // VNPay tính đơn vị số tiền là nhân 100
  const vnpAmount = Math.round(amount * 100);

  let vnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: transactionId,
    vnp_OrderInfo: orderInfo || `Thanh toan don hang ${transactionId}`,
    vnp_OrderType: 'other',
    vnp_Amount: vnpAmount,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode) {
    vnpParams.vnp_BankCode = bankCode;
  }

  vnpParams = sortObject(vnpParams);

  const signData = new URLSearchParams(vnpParams).toString();
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  vnpParams.vnp_SecureHash = signed;
  return `${vnpUrl}?${new URLSearchParams(vnpParams).toString()}`;
}

/**
 * Xử lý xác thực phản hồi IPN / Callback từ VNPay
 *
 * @param {object} vnpParams - Các query params từ VNPay gửi về
 * @returns {Promise<{ isSuccess: boolean, code: string, message: string }>}
 */
export async function verifyVnpayCallback(vnpParams) {
  const secureHash = vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHash;
  delete vnpParams.vnp_SecureHashType;

  const sortedParams = sortObject(vnpParams);
  const secretKey = process.env.VNP_HASH_SECRET || process.env.VNPAY_HASH_SECRET || 'DEMO_SECRET';

  const signData = new URLSearchParams(sortedParams).toString();
  const hmac = crypto.createHmac('sha512', secretKey);
  const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Xác thực chữ ký
  if (secureHash !== checkHash) {
    return { isSuccess: false, code: '97', message: 'Chữ ký không hợp lệ (Checksum failed)' };
  }

  const transactionId = vnpParams.vnp_TxnRef;
  const responseCode = vnpParams.vnp_ResponseCode;
  const transactionStatus = vnpParams.vnp_TransactionStatus;
  const actualAmount = Math.round(Number(vnpParams.vnp_Amount || 0) / 100);

  // Kiểm tra thời hạn giao dịch
  const currentTx = await checkPaymentStatus(transactionId);
  if (currentTx.status === 'expired') {
    return { isSuccess: false, code: '11', message: 'Giao dịch đã hết hạn quá 15 phút' };
  }

  // Mã 00 là thành công
  if (responseCode === '00' && transactionStatus === '00') {
    await fulfillPaymentSuccess({
      transactionId,
      gatewayTransactionNo: vnpParams.vnp_TransactionNo || '',
      paidAmount: actualAmount,
      gatewayPayload: vnpParams,
    });
    return { isSuccess: true, code: '00', message: 'Thanh toán VNPay thành công' };
  }

  return { isSuccess: false, code: responseCode, message: 'Giao dịch VNPay không thành công hoặc bị hủy' };
}
