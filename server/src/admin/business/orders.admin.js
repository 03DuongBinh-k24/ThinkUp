import { ObjectId } from 'mongodb';
import { getMongoDb } from '../../user/db.js';
import { createAdminRoleMiddleware } from '../auth/admin-rbac.js';
import { randomUUID } from 'node:crypto';
import { publishAdminNotificationToRoster } from '../notifications/notifications.admin.js';

const error = (message, status = 400, code = 'ORDER_QUERY_INVALID') => Object.assign(new Error(message), { status, code });
const orderStatus = value => ({ completed: 'success', paid: 'success', success: 'success', pending: 'pending', failed: 'cancelled', cancelled: 'cancelled', expired: 'cancelled' })[value] || value;
const dateOf = value => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(typeof value === 'string' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value) ? value.replace(' ', 'T') + '+07:00' : value);
  return Number.isFinite(date.getTime()) ? date : null;
};
const summaryOf = value => { try { return typeof value === 'string' ? JSON.parse(value) : value || {}; } catch { return {}; } };
const money = value => { const number = Number(value); return Number.isFinite(number) ? number : null; };
const safe = value => String(value ?? '').replace(/^[=+\-@\t\r]/, "'$&");

export function parseOrderQuery(query = {}) {
  const status = query.status || '';
  if (status && !['success', 'pending', 'cancelled'].includes(status)) throw error('Trạng thái không hợp lệ.');
  const method = query.method || '';
  if (typeof method !== 'string' || method.length > 80) throw error('Phương thức thanh toán không hợp lệ.');
  const q = query.q || '';
  if (typeof q !== 'string' || q.length > 100) throw error('Từ khóa không hợp lệ.');
  const from = query.from ? dateOf(/^\d{4}-\d\d-\d\d$/.test(query.from) ? `${query.from}T00:00:00+07:00` : query.from) : null;
  const to = query.to ? dateOf(/^\d{4}-\d\d-\d\d$/.test(query.to) ? `${query.to}T23:59:59.999+07:00` : query.to) : null;
  if ((query.from && !from) || (query.to && !to) || (from && to && from > to)) throw error('Khoảng ngày không hợp lệ.');
  const page = Number(query.page || 1), pageSize = Number(query.pageSize || 8);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw error('Phân trang không hợp lệ.');
  const sort = query.sort || 'newest';
  if (!['newest', 'oldest'].includes(sort)) throw error('Thứ tự không hợp lệ.');
  return { q: q.trim().toLocaleLowerCase('vi-VN'), status, method, from, to, page, pageSize, sort };
}

async function rowsFor(db) {
  const transactions = await db.collection('payment_transactions').find({ record_type: { $ne: 'gateway_receipt' } }).toArray();
  const ids = [...new Set(transactions.map(row => String(row.user_id || '')).filter(ObjectId.isValid))].map(id => new ObjectId(id));
  const users = ids.length ? await db.collection('users').find({ _id: { $in: ids } }, { projection: { full_name: 1, name: 1, email: 1 } }).toArray() : [];
  const byId = new Map(users.map(user => [String(user._id), user]));
  return transactions.map(row => {
    const summary = summaryOf(row.order_summary);
    const user = byId.get(String(row.user_id));
    return { id: row.order_id || row.transaction_id, transactionId: row.transaction_id || null, learnerId: String(row.user_id || ''), learner: user?.full_name || user?.name || null, email: user?.email || null,
      status: orderStatus(row.status), rawStatus: row.status, method: row.payment_method || null, amount: money(row.amount), currency: row.currency || 'VND', createdAt: dateOf(row.created_at)?.toISOString() || null, paidAt: dateOf(row.paid_at)?.toISOString() || null,
      invoiceCode: row.invoice_code || null, voucherCode: summary.voucher_code || row.voucher_code || null, voucherDiscount: money(summary.voucher_discount ?? row.voucher_discount), subtotal: money(summary.subtotal), total: money(summary.total ?? row.amount),
      courses: Array.isArray(summary.courses) ? summary.courses.map(item => ({ id: item.id || item.course_id || null, title: item.title || null, price: money(item.price), originalPrice: money(item.original_price) })) : [] };
  });
}

function filtered(rows, filters) {
  return rows.filter(row => {
    const date = dateOf(row.createdAt);
    return (!filters.status || row.status === filters.status) && (!filters.method || row.method === filters.method)
      && (!filters.from || (date && date >= filters.from)) && (!filters.to || (date && date <= filters.to))
      && (!filters.q || [row.id, row.transactionId, row.learner, row.email].some(value => String(value || '').toLocaleLowerCase('vi-VN').includes(filters.q)));
  }).sort((a, b) => filters.sort === 'oldest' ? String(a.createdAt).localeCompare(String(b.createdAt)) : String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function listAdminOrders(query = {}, options = {}) {
  const filters = parseOrderQuery(query);
  const rows = filtered(await rowsFor(options.db || await getMongoDb()), filters);
  return { success: true, items: rows.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize), total: rows.length, page: filters.page, pageSize: filters.pageSize };
}
export async function getAdminOrder(id, options = {}) {
  if (typeof id !== 'string' || !id || id.length > 100) throw error('Mã đơn không hợp lệ.');
  const row = (await rowsFor(options.db || await getMongoDb())).find(item => item.id === id || item.transactionId === id);
  if (!row) throw error('Không tìm thấy đơn hàng.', 404, 'ORDER_NOT_FOUND');
  return { success: true, order: row };
}
export async function getAdminOrderSummary(query = {}, options = {}) {
  const filters = parseOrderQuery(query);
  const rows = filtered(await rowsFor(options.db || await getMongoDb()), { ...filters, status: '', q: '', method: '' });
  return { success: true, total: rows.length, successCount: rows.filter(row => row.status === 'success').length, pendingCount: rows.filter(row => row.status === 'pending').length, cancelledCount: rows.filter(row => row.status === 'cancelled').length };
}
export async function exportAdminOrders(query = {}, options = {}) {
  const format = query.format;
  if (!['csv', 'excel'].includes(format)) throw error('Định dạng xuất không hợp lệ.');
  const filters = parseOrderQuery(query);
  const rows = filtered(await rowsFor(options.db || await getMongoDb()), filters);
  const columns = ['Mã đơn', 'Mã giao dịch', 'Học viên', 'Email', 'Trạng thái', 'Phương thức', 'Số tiền', 'Ngày tạo', 'Ngày thanh toán', 'Mã hóa đơn'];
  const values = rows.map(row => [row.id, row.transactionId, row.learner, row.email, row.status, row.method, row.amount, row.createdAt, row.paidAt, row.invoiceCode]);
  if (format === 'csv') return { body: '\uFEFF' + [columns, ...values].map(line => line.map(value => `"${safe(value).replaceAll('"', '""')}"`).join(',')).join('\r\n'), type: 'text/csv; charset=utf-8', filename: 'thinkup-don-hang.csv' };
  const escapeXml = value => safe(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const xmlRows = [columns, ...values].map(line => `<Row>${line.map(value => `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join('')}</Row>`).join('');
  return { body: `<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Don hang"><Table>${xmlRows}</Table></Worksheet></Workbook>`, type: 'application/vnd.ms-excel; charset=utf-8', filename: 'thinkup-don-hang.xls' };
}
async function auditOrderAction(db, req, action, orderId, before, after, reason) {
  const { recordAuditLog } = await import('../auth/auth.admin.js');
  const result = await recordAuditLog(db, { adminId: req.adminId, ip: req.ip, userAgent: req.headers?.['user-agent'], action,
    details: { entity: { type: 'order', id: String(orderId) }, before, after, outcome: 'success', correlation_id: randomUUID(), metadata: { reason } } });
  if (!result) throw error('Không ghi được nhật ký kiểm toán; thao tác cần được đối soát.', 503, 'AUDIT_UNAVAILABLE');
}
export async function decideAdminOrder(id, action, payload = {}, req = {}, options = {}) {
  if (!['confirm', 'cancel'].includes(action)) throw error('Thao tác đơn hàng không hợp lệ.');
  const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';
  if (reason.length < 10 || reason.length > 1000) throw error('Lý do phải từ 10 đến 1000 ký tự.', 400, 'ORDER_REASON_INVALID');
  const db = options.db || await getMongoDb();
  const tx = await db.collection('payment_transactions').findOne({ $or: [{ order_id: id }, { transaction_id: id }], record_type: { $ne: 'gateway_receipt' } });
  if (!tx) throw error('Không tìm thấy đơn hàng.', 404, 'ORDER_NOT_FOUND');
  const order = await db.collection('orders').findOne({ order_id: tx.order_id });
  if (!order) throw error('Thiếu bản ghi đơn hàng để đối soát.', 503, 'ORDER_DATA_INVALID');
  if (action === 'confirm') {
    if (!['pending', 'paid'].includes(tx.status) || !['pending', 'paid'].includes(order.status)) throw error('Chỉ xác nhận đơn đang chờ hoặc đã có thanh toán cần hoàn tất.', 409, 'ORDER_STATE_CONFLICT');
    if (tx.status !== 'paid' || tx.actual_paid_amount !== tx.amount || tx.currency !== 'VND') throw error('Chỉ có thể xác nhận giao dịch đã xác minh đủ số tiền VND.', 409, 'ORDER_PAYMENT_UNVERIFIED');
    const { completePaidOrder } = await import('../../user/payment/payment.service.js');
    let result;
    try { result = await completePaidOrder(tx.transaction_id, options); }
    catch (cause) {
      await auditOrderAction(db, req, 'ADMIN_ORDER_CONFIRM_FAILED', tx.order_id, { status: tx.status, fulfillmentStatus: tx.fulfillment_status }, { outcome: 'failed' }, reason);
      throw cause;
    }
    const updated = await db.collection('payment_transactions').findOne({ _id: tx._id });
    if (updated?.status !== 'success' || updated?.fulfillment_status !== 'completed') throw error('Không thể hoàn tất cấp quyền học; giao dịch được giữ để đối soát.', 409, 'ORDER_FULFILLMENT_INCOMPLETE');
    try { await auditOrderAction(db, req, 'ADMIN_ORDER_CONFIRMED', tx.order_id, { status: tx.status, fulfillmentStatus: tx.fulfillment_status }, { status: updated.status, fulfillmentStatus: updated.fulfillment_status }, reason); }
    catch (cause) {
      await auditOrderAction(db, req, 'ADMIN_ORDER_CONFIRM_AUDIT_FAILED', tx.order_id, { status: tx.status }, { status: updated.status, fulfillmentStatus: updated.fulfillment_status, auditError: true }, reason).catch(() => {});
      throw cause;
    }
    await publishAdminNotificationToRoster(db, {
      type: 'order', severity: 'info', title: 'Đơn hàng đã được xác nhận',
      message: `Đơn hàng ${tx.order_id} đã hoàn tất thanh toán và cấp quyền học.`,
      href: '/business/orders', eventKey: 'admin.order.confirmed',
      dedupeKey: `admin.order.confirmed:${String(tx._id)}`,
    });
    return { success: true, orderId: tx.order_id, status: updated.status, fulfillmentStatus: updated.fulfillment_status, result };
  }
  if (!['pending', 'expired'].includes(tx.status) || !['pending', 'expired'].includes(order.status)) throw error('Chỉ được hủy đơn chưa thanh toán hoặc đã hết hạn.', 409, 'ORDER_STATE_CONFLICT');
  const voucherCollection = tx.voucher_collection, voucherId = tx.voucher_id;
  if (tx.voucher_reserved && !tx.voucher_released && (!voucherCollection || !voucherId)) throw error('Thiếu tham chiếu lượt voucher; cần đối soát thủ công.', 503, 'ORDER_VOUCHER_DATA_INVALID');
  if (!db.client?.startSession) throw error('CSDL cần hỗ trợ transaction.', 503, 'ORDER_STORAGE_UNAVAILABLE');
  const session = db.client.startSession(), now = new Date(options.now ?? Date.now());
  try {
    await session.withTransaction(async () => {
      const txFilter = { _id: tx._id, status: tx.status };
      txFilter.voucher_released = tx.voucher_released === undefined ? { $exists: false } : tx.voucher_released;
      const changed = await db.collection('payment_transactions').updateOne(txFilter,
        { $set: { status: 'cancelled', cancellation_reason: reason, cancelled_at: now, cancelled_by: String(req.adminId), voucher_released: Boolean(tx.voucher_reserved && !tx.voucher_released), updated_at: now } }, { session });
      if (!changed.modifiedCount) throw error('Đơn vừa được thay đổi.', 409, 'ORDER_STATE_CONFLICT');
      if (tx.voucher_reserved && !tx.voucher_released) {
        const released = await db.collection(voucherCollection).updateOne({ _id: voucherId, usage_count: { $gt: 0 } }, { $inc: { usage_count: -1 } }, { session });
        if (!released.matchedCount) throw error('Không giải phóng được lượt voucher.', 503, 'ORDER_VOUCHER_RELEASE_FAILED');
      }
      const orderChanged = await db.collection('orders').updateOne({ _id: order._id, status: order.status }, { $set: { status: 'cancelled', cancellation_reason: reason, cancelled_at: now, cancelled_by: String(req.adminId), updated_at: now } }, { session });
      if (!orderChanged.modifiedCount) throw error('Đơn vừa được thay đổi.', 409, 'ORDER_STATE_CONFLICT');
    });
  } finally { await session.endSession(); }
  await auditOrderAction(db, req, 'ADMIN_ORDER_CANCELLED', tx.order_id, { status: tx.status }, { status: 'cancelled' }, reason);
  await publishAdminNotificationToRoster(db, {
    type: 'order', severity: 'warning', title: 'Đơn hàng đã bị hủy',
    message: `Đơn hàng ${tx.order_id} đã bị hủy sau khi rà soát.`,
    href: '/business/orders', eventKey: 'admin.order.cancelled',
    dedupeKey: `admin.order.cancelled:${String(tx._id)}`,
  });
  return { success: true, orderId: tx.order_id, status: 'cancelled', cancelledAt: now.toISOString() };
}
export function createAdminOrdersRouter(express, requireAdmin) {
  const router = express.Router();
  const role = createAdminRoleMiddleware(['SA', 'FA']);
  router.use(requireAdmin, role);
  router.get('/summary', async (req, res, next) => { try { res.json(await getAdminOrderSummary(req.query)); } catch (e) { next(e); } });
  router.get('/export', async (req, res, next) => { try { const file = await exportAdminOrders(req.query); res.type(file.type).attachment(file.filename).send(file.body); } catch (e) { next(e); } });
  router.get('/', async (req, res, next) => { try { res.json(await listAdminOrders(req.query)); } catch (e) { next(e); } });
  router.get('/:id', async (req, res, next) => { try { res.json(await getAdminOrder(req.params.id)); } catch (e) { next(e); } });
  router.post('/:id/confirm', async (req, res, next) => { try { res.json(await decideAdminOrder(req.params.id, 'confirm', req.body, req)); } catch (e) { next(e); } });
  router.post('/:id/cancel', async (req, res, next) => { try { res.json(await decideAdminOrder(req.params.id, 'cancel', req.body, req)); } catch (e) { next(e); } });
  return router;
}
