/**
 * Module sinh mã định danh đơn hàng và giao dịch thanh toán.
 *
 * Phân biệt hai loại mã:
 * ─ Mã đơn hàng (Order ID)    : Tiền tố DH + chuỗi số.
 *   Sinh khi người dùng nhấn "Thanh toán". Gắn với đơn hàng.
 *   Tồn tại bất kể trạng thái: chờ / thành công / thất bại.
 *
 * ─ Mã giao dịch (Transaction ID) : Tiền tố GD + chuỗi số.
 *   Sinh khi một phiên thanh toán được khởi tạo.
 *   Được điền vào ô mô tả chuyển khoản ngân hàng / cổng thanh toán.
 *   Cũng tồn tại bất kể trạng thái thanh toán.
 *
 * Cơ chế đảm bảo không trùng lặp:
 *   Sử dụng collection `counters` trong MongoDB (atomic findOneAndUpdate).
 *   Mỗi loại mã có một counter key riêng: 'order_id_seq' và 'transaction_id_seq'.
 *
 * File này được đặt riêng để sau này module mua hàng và module thanh toán
 * có thể import độc lập mà không phụ thuộc lẫn nhau.
 */

import { getMongoDb } from '../db.js';

// ─── 0. Hằng Số ───────────────────────────────────────────────────────────────

/** Tiền tố mã đơn hàng */
const ORDER_PREFIX = 'DH';

/** Tiền tố mã giao dịch */
const TRANSACTION_PREFIX = 'GD';

/** Collection lưu bộ đếm tự tăng */
const COUNTERS_COLLECTION = 'counters';

/** Key đếm đơn hàng */
const ORDER_COUNTER_KEY = 'order_id_seq';

/** Key đếm giao dịch */
const TRANSACTION_COUNTER_KEY = 'transaction_id_seq';

// ─── 1. Hàm Nội Bộ ────────────────────────────────────────────────────────────

/**
 * Lấy số thứ tự tiếp theo từ collection `counters` (atomic, an toàn với concurrent).
 *
 * @param {import('mongodb').Db} db
 * @param {string} counterKey - Khóa đếm (ORDER_COUNTER_KEY hoặc TRANSACTION_COUNTER_KEY)
 * @returns {Promise<number>} Số thứ tự mới (bắt đầu từ 1)
 */
async function getNextSequence(db, counterKey) {
  const result = await db.collection(COUNTERS_COLLECTION).findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.seq;
}

/**
 * Định dạng số thứ tự thành chuỗi số có độ dài cố định (pad trái bằng '0').
 *
 * @param {number} seq - Số thứ tự
 * @param {number} [length=8] - Số ký tự số tối thiểu
 * @returns {string} Chuỗi số đã pad (VD: 1 → "00000001")
 */
function padSequence(seq, length = 8) {
  return String(seq).padStart(length, '0');
}

/**
 * Lấy timestamp ngày hiện tại theo định dạng YYYYMMDD (múi giờ UTC+7).
 *
 * @returns {string} Ví dụ: "20261015"
 */
function getDateStamp() {
  const now = new Date();
  const vnOffset = 7 * 60 * 60 * 1000;
  const vnDate = new Date(now.getTime() + vnOffset);
  const y = vnDate.getUTCFullYear();
  const m = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(vnDate.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// ─── 2. Hàm Xuất Khẩu Chính ───────────────────────────────────────────────────

/**
 * Sinh mã đơn hàng duy nhất theo định dạng: DH{YYYYMMDD}{SEQ8}.
 *
 * Ví dụ: DH2026101500000001
 *
 * Khi nào dùng:
 *   - Gọi hàm này khi người dùng nhấn nút "Thanh toán" và hệ thống
 *     tạo bản ghi đơn hàng (order) trong CSDL.
 *   - Mã này gắn với đơn hàng suốt vòng đời, không đổi dù trạng thái thay đổi.
 *
 * @returns {Promise<string>} Mã đơn hàng (VD: "DH2026101500000001")
 */
export async function generateOrderId() {
  const db = await getMongoDb();
  const seq = await getNextSequence(db, ORDER_COUNTER_KEY);
  return `${ORDER_PREFIX}${getDateStamp()}${padSequence(seq)}`;
}

/**
 * Sinh mã giao dịch duy nhất theo định dạng: GD{YYYYMMDD}{SEQ8}.
 *
 * Ví dụ: GD2026101500000001
 *
 * Khi nào dùng:
 *   - Gọi hàm này khi một phiên thanh toán được khởi tạo qua cổng thanh toán
 *     (VNPay, MoMo, PayPal...) hoặc khi tạo mã chuyển khoản ngân hàng.
 *   - Mã này được điền vào ô "Nội dung chuyển khoản" / "Mô tả giao dịch".
 *   - Một đơn hàng có thể có nhiều phiên giao dịch (vd: lần 1 thất bại, lần 2 thành công).
 *
 * @returns {Promise<string>} Mã giao dịch (VD: "GD2026101500000001")
 */
export async function generateTransactionId() {
  const db = await getMongoDb();
  const seq = await getNextSequence(db, TRANSACTION_COUNTER_KEY);
  return `${TRANSACTION_PREFIX}${getDateStamp()}${padSequence(seq)}`;
}

/**
 * Sinh đồng thời cả mã đơn hàng và mã giao dịch trong một lần gọi.
 * Dùng khi tạo một đơn hàng mới kèm phiên thanh toán đầu tiên.
 *
 * @returns {Promise<{ orderId: string, transactionId: string }>}
 */
export async function generateOrderWithTransaction() {
  const db = await getMongoDb();
  const [orderSeq, transactionSeq] = await Promise.all([
    getNextSequence(db, ORDER_COUNTER_KEY),
    getNextSequence(db, TRANSACTION_COUNTER_KEY),
  ]);
  const dateStamp = getDateStamp();
  return {
    orderId: `${ORDER_PREFIX}${dateStamp}${padSequence(orderSeq)}`,
    transactionId: `${TRANSACTION_PREFIX}${dateStamp}${padSequence(transactionSeq)}`,
  };
}

/**
 * Kiểm tra định dạng mã đơn hàng có hợp lệ không.
 * @param {string} code
 * @returns {boolean}
 */
export function isValidOrderId(code) {
  return typeof code === 'string' && /^DH\d{16}$/.test(code);
}

/**
 * Kiểm tra định dạng mã giao dịch có hợp lệ không.
 * @param {string} code
 * @returns {boolean}
 */
export function isValidTransactionId(code) {
  return typeof code === 'string' && /^GD\d{16}$/.test(code);
}
