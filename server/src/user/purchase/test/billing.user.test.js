/**
 * File kiểm thử độc lập cho chức năng Chi Tiết Giao Dịch, Thanh Toán & Hóa Đơn Điện Tử (Billing).
 * Chạy: node --test src/user/purchase/test/billing.user.test.js
 *
 * Kiểm thử toàn diện:
 * 1. Truy xuất thông tin chi tiết bằng mã đơn hàng (order_id) và mã giao dịch (transaction_id).
 * 2. Xác thực thông tin người mua (họ và tên, email, số điện thoại).
 * 3. Xác thực danh sách khóa học (tên, giảng viên, giá giảm, giá gốc, ảnh bìa, badge).
 * 4. Xác thực bóc tách tài chính (tạm tính theo giá gốc, giảm giá khóa học, mã giảm giá, tổng thanh toán).
 * 5. Xác thực thông tin thanh toán (phương thức, ngân hàng, số TK, chủ TK, nội dung CK, số tiền đã TT, thời gian TT ngày/tháng/năm giờ:phút:giây, trạng thái).
 * 6. Xác thực hóa đơn điện tử (mã hóa đơn, mã đơn hàng, thời gian phát hành, trạng thái).
 * 7. Kiểm tra bảo mật: 401 khi chưa đăng nhập, 403 khi truy cập giao dịch của người khác, 404 khi không tồn tại.
 * 8. Kiểm tra khởi tạo router Express cho Billing.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  getTransactionBillingDetail,
  createBillingRouter,
  formatVND,
  formatDateTimeParts,
} from '../billing.user.js';
import { getMongoDb, closeMongoDb } from '../../db.js';

// ─── Hằng số kiểm thử ────────────────────────────────────────────────────────

const TEST_USER_ID = '1';
const OTHER_USER_ID = '999999';

describe('Chức Năng Chi Tiết Giao Dịch & Hóa Đơn Điện Tử (Billing)', () => {
  let sampleTxn = null;

  before(async () => {
    const db = await getMongoDb();
    // Lấy một giao dịch thực tế của user 1 để kiểm thử
    sampleTxn = await db.collection('payment_transactions').findOne({
      user_id: TEST_USER_ID,
    });
  });

  after(async () => {
    await closeMongoDb();
  });

  // ─── 1. Hàm Tiện Ích Format ─────────────────────────────────────────────────

  describe('1. Hàm tiện ích format tiền và ngày giờ', () => {
    it('TC-FMT-01: formatVND định dạng chuẩn tiền tệ Việt Nam', () => {
      assert.equal(formatVND(499000), '499.000đ');
      assert.equal(formatVND(1099000), '1.099.000đ');
      assert.equal(formatVND(0), '0đ');
    });

    it('TC-FMT-02: formatDateTimeParts phân tách đầy đủ ngày, tháng, năm, giờ, phút, giây', () => {
      const parts = formatDateTimeParts('2026-07-13 19:50:53');
      assert.ok(parts, 'Phải parse được ngày giờ');
      assert.equal(parts.dateOnly, '13/07/2026');
      assert.equal(parts.timeOnly, '19:50:53');
      assert.equal(parts.full, '13/07/2026 19:50:53');
      assert.equal(parts.text, 'Ngày 13 tháng 07 năm 2026, 19:50:53');
    });

    it('TC-FMT-03: formatDateTimeParts trả về null với ngày rỗng hoặc không hợp lệ', () => {
      assert.equal(formatDateTimeParts(null), null);
      assert.equal(formatDateTimeParts(''), null);
      assert.equal(formatDateTimeParts('invalid-date-string-xyz'), null);
    });
  });

  // ─── 2. Truy xuất theo mã giao dịch và mã đơn hàng ─────────────────────────

  describe('2. Truy xuất theo mã giao dịch (transaction_id) hoặc mã đơn hàng (order_id)', () => {
    it('TC-GET-01: Truy xuất thành công bằng transaction_id', async () => {
      assert.ok(sampleTxn, 'Cần có giao dịch mẫu trong DB');
      const detail = await getTransactionBillingDetail(TEST_USER_ID, sampleTxn.transaction_id);

      assert.ok(detail, 'Phải trả về chi tiết giao dịch');
      assert.equal(detail.transaction_id, sampleTxn.transaction_id);
      assert.equal(detail.transactionCode, sampleTxn.transaction_id);
      assert.equal(detail.status, sampleTxn.status);
    });

    it('TC-GET-02: Truy xuất thành công bằng order_id (nếu có trường order_id)', async () => {
      const orderId = sampleTxn.order_id || sampleTxn.transaction_id;
      const detail = await getTransactionBillingDetail(TEST_USER_ID, orderId);

      assert.ok(detail);
      assert.equal(detail.order_id, orderId);
      assert.equal(detail.id, orderId);
    });

    it('TC-GET-03: Truy xuất thành công bằng MongoDB _id', async () => {
      const detail = await getTransactionBillingDetail(TEST_USER_ID, String(sampleTxn._id));
      assert.ok(detail);
      assert.equal(detail.transaction_id, sampleTxn.transaction_id);
    });
  });

  // ─── 3. Thông tin người mua (Buyer) ────────────────────────────────────────

  describe('3. Truy xuất thông tin người mua', () => {
    it('TC-BUYER-01: Chi tiết chứa họ tên, email, số điện thoại người mua', async () => {
      const detail = await getTransactionBillingDetail(TEST_USER_ID, sampleTxn.transaction_id);

      assert.ok(detail.buyer, 'Thiếu trường buyer');
      assert.ok('name' in detail.buyer, 'Thiếu buyer.name');
      assert.ok('email' in detail.buyer, 'Thiếu buyer.email');
      assert.ok('phone' in detail.buyer, 'Thiếu buyer.phone');

      assert.ok(detail.invoice.buyer, 'Thiếu invoice.buyer');
      assert.equal(detail.invoice.buyer.name, detail.buyer.name);
      assert.equal(detail.invoice.buyer.email, detail.buyer.email);
      assert.equal(detail.invoice.buyer.phone, detail.buyer.phone);
    });
  });

  // ─── 4. Thông tin đơn hàng & Khóa học ──────────────────────────────────────

  describe('4. Truy xuất thông tin đơn hàng và danh sách khóa học', () => {
    it('TC-ORDER-01: Chứa số lượng khóa học, tên, giảng viên, giá và ảnh bìa', async () => {
      const detail = await getTransactionBillingDetail(TEST_USER_ID, sampleTxn.transaction_id);

      assert.ok(detail.order, 'Thiếu trường order');
      assert.ok(Array.isArray(detail.order.courses), 'order.courses phải là mảng');
      assert.ok(detail.order.countLabel.includes('khóa học'), 'countLabel phải có từ khóa học');

      if (detail.order.courses.length > 0) {
        const c = detail.order.courses[0];
        assert.ok(c.id, 'Khóa học phải có id');
        assert.ok(c.title, 'Khóa học phải có tên (title)');
        assert.ok(c.instructor, 'Khóa học phải có tác giả/giảng viên (instructor)');
        assert.ok('price' in c, 'Khóa học phải có giá bán (price)');
        assert.ok('originalPrice' in c, 'Khóa học phải có giá gốc (originalPrice)');
        assert.ok('thumbnail_url' in c, 'Khóa học phải có trường ảnh bìa (thumbnail_url)');
      }
    });

    it('TC-ORDER-02: Bóc tách đúng các khoản giá trị trong đơn hàng', async () => {
      const detail = await getTransactionBillingDetail(TEST_USER_ID, sampleTxn.transaction_id);

      // Giá tạm tính (tổng theo giá gốc)
      assert.ok('subtotal' in detail.order, 'Thiếu order.subtotal');
      assert.ok('subtotal_number' in detail.order, 'Thiếu order.subtotal_number');

      // Giảm giá khóa học
      assert.ok('courseDiscount' in detail.order, 'Thiếu order.courseDiscount');
      assert.ok('course_discount_number' in detail.order, 'Thiếu order.course_discount_number');

      // Mã giảm giá + số tiền giảm
      assert.ok('voucherCode' in detail.order, 'Thiếu order.voucherCode');
      assert.ok('voucherDiscount' in detail.order, 'Thiếu order.voucherDiscount');

      // Tổng thanh toán thực sự
      assert.ok('total' in detail.order, 'Thiếu order.total');
      assert.ok('total_number' in detail.order, 'Thiếu order.total_number');
      assert.ok(detail.order.total_number >= 0, 'total_number không được âm');
    });
  });

  // ─── 5. Thông tin thanh toán (Payment) ──────────────────────────────────────

  describe('5. Truy xuất thông tin thanh toán', () => {
    it('TC-PAY-01: Chứa đầy đủ phương thức, ngân hàng, STK, chủ TK, nội dung CK, số tiền và thời gian', async () => {
      const detail = await getTransactionBillingDetail(TEST_USER_ID, sampleTxn.transaction_id);

      assert.ok(detail.payment, 'Thiếu trường payment');
      assert.ok(detail.payment.bank, 'payment.bank phải có giá trị');
      assert.ok(detail.payment.accountNumber, 'payment.accountNumber phải có giá trị');
      assert.ok(detail.payment.accountName, 'payment.accountName phải có giá trị');
      assert.ok(detail.payment.transferContent, 'payment.transferContent phải có giá trị');
      assert.ok(detail.payment.paidAmount, 'payment.paidAmount phải có giá trị');
      assert.ok(detail.payment.paidAt, 'payment.paidAt phải có giá trị');
      assert.ok(detail.payment.status, 'payment.status phải có giá trị');
    });
  });

  // ─── 6. Hóa đơn điện tử (Invoice) ──────────────────────────────────────────

  describe('6. Truy xuất hóa đơn điện tử', () => {
    it('TC-INV-01: Chứa mã hóa đơn, mã đơn hàng, thời gian phát hành và trạng thái', async () => {
      const detail = await getTransactionBillingDetail(TEST_USER_ID, sampleTxn.transaction_id);

      assert.ok(detail.invoice, 'Thiếu trường invoice');
      assert.ok(detail.invoice.code, 'Thiếu invoice.code');
      assert.ok(detail.invoice.order_id, 'Thiếu invoice.order_id');
      assert.ok(detail.invoice.issuedAt, 'Thiếu invoice.issuedAt');
      assert.ok(detail.invoice.status, 'Thiếu invoice.status');
    });
  });

  // ─── 7. Kiểm tra bảo mật và ngoại lệ ───────────────────────────────────────

  describe('7. Kiểm tra bảo mật & ngoại lệ', () => {
    it('TC-SEC-01: Ném lỗi 401 khi không truyền userId', async () => {
      await assert.rejects(
        () => getTransactionBillingDetail(null, sampleTxn.transaction_id),
        err => {
          assert.equal(err.status, 401);
          return true;
        }
      );
    });

    it('TC-SEC-02: Ném lỗi 400 khi mã giao dịch rỗng', async () => {
      await assert.rejects(
        () => getTransactionBillingDetail(TEST_USER_ID, ''),
        err => {
          assert.equal(err.status, 400);
          return true;
        }
      );
    });

    it('TC-SEC-03: Ném lỗi 404 khi giao dịch không tồn tại', async () => {
      await assert.rejects(
        () => getTransactionBillingDetail(TEST_USER_ID, 'NON_EXISTENT_TRANSACTION_XYZ_123'),
        err => {
          assert.equal(err.status, 404);
          return true;
        }
      );
    });

    it('TC-SEC-04: Ném lỗi 403 khi truy cập giao dịch của người khác', async () => {
      await assert.rejects(
        () => getTransactionBillingDetail(OTHER_USER_ID, sampleTxn.transaction_id),
        err => {
          assert.equal(err.status, 403);
          return true;
        }
      );
    });
  });

  // ─── 8. Kiểm tra khởi tạo router Express ───────────────────────────────────

  describe('8. Router Express createBillingRouter', () => {
    it('TC-ROUTER-01: createBillingRouter trả về Express Router hợp lệ', async () => {
      const express = (await import('express')).default;
      const fakeAuth = (req, res, next) => next();
      const router = createBillingRouter(express, fakeAuth);

      assert.ok(router, 'Router phải được khởi tạo');
      assert.equal(typeof router, 'function', 'Express router là middleware function');
    });
  });
});
