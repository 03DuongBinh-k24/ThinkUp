import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLLECTION_CERTIFICATES,
  formatVietnamVerificationTime,
  formatVietnamIssuedDate,
  formatEnglishIssuedDate,
  normalizeCertificateCode,
  buildCertificateQrUrl,
  generateCertificateCode,
  formatCertificateDto,
  verifyCertificateByCode,
  getUserCertificates,
  issueCertificateForUser,
} from '../certificate.user.js';
import { getMongoDb, closeMongoDb } from '../../db.js';

test('Certificate Backend Service Test Suite (SPEC-CERT-MNG-01 & SPEC-CERT-VERIFY-01)', async (t) => {
  const db = await getMongoDb();
  const certColl = db.collection(COLLECTION_CERTIFICATES);

  const testUserId = 'test_user_cert_123456';
  const testCourseId = 'test_course_react_pro';
  const testCodeValid = 'TEST-CERT-2026';

  // Dọn dẹp dữ liệu test trước khi thực hiện
  await certColl.deleteMany({
    $or: [
      { user_id: testUserId },
      { code: testCodeValid },
      { code: 'MOCK-INVALID-CODE' },
    ],
  });

  t.after(async () => {
    // Dọn dẹp dữ liệu test sau khi hoàn tất
    await certColl.deleteMany({
      $or: [
        { user_id: testUserId },
        { code: testCodeValid },
        { code: 'MOCK-INVALID-CODE' },
      ],
    });
    await closeMongoDb();
  });

  await t.test('1. Tiện ích thời gian & chuỗi chuẩn hóa', () => {
    // 1.1 Format thời gian theo giờ Việt Nam
    const sampleDate = new Date('2026-10-29T07:30:00.000Z'); // 07:30 UTC = 14:30 VN (UTC+7)
    const vnTime = formatVietnamVerificationTime(sampleDate);
    assert.equal(vnTime, '14:30 29/10/2026', 'Thời gian xác thực phải hiển thị theo đúng múi giờ Việt Nam');

    const vnIssued = formatVietnamIssuedDate(sampleDate);
    assert.equal(vnIssued, '29/10/2026', 'Ngày cấp dạng VN phải là dd/MM/yyyy');

    const enIssued = formatEnglishIssuedDate(sampleDate);
    assert.ok(enIssued.includes('2026'), 'Ngày cấp dạng tiếng Anh phải có năm');

    // 1.2 Chuẩn hóa mã chứng chỉ
    assert.equal(normalizeCertificateCode('  hop-le-123  '), 'HOP-LE-123', 'Mã chứng chỉ phải được trim và viết hoa');

    // 1.3 URL mã QR
    const qrUrl = buildCertificateQrUrl('HOP-LE-123');
    assert.ok(qrUrl.includes('/tra-cuu?code=HOP-LE-123'), 'URL mã QR phải trỏ tới trang /tra-cuu?code=...');

    // 1.4 Sinh mã ngẫu nhiên
    const code = generateCertificateCode();
    assert.match(code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Mã sinh ra phải có format XXXX-XXXX');
  });

  await t.test('2. Đồng nhất studentName và certificateName & Không xuất studentCode', () => {
    const rawDoc = {
      code: 'TEST-CODE-01',
      student_name: 'Trần Thị Mai',
      course_title: 'UI/UX Design Master',
      issued_at_vn: '20/10/2026',
      issued_at_en: 'Oct 20, 2026',
      status: 'valid',
      student_code: '098123456789', // Giả sử trong DB có lưu
    };

    const dto = formatCertificateDto(rawDoc);
    assert.equal(dto.studentName, 'Trần Thị Mai');
    assert.equal(dto.certificateName, 'Trần Thị Mai', 'studentName và certificateName bắt buộc phải giống nhau');
    assert.equal(dto.studentCode, undefined, 'Tuyệt đối không xuất trường studentCode');
    assert.ok(dto.qrUrl.includes('/tra-cuu?code=TEST-CODE-01'), 'Phải gắn url qr code động');
  });

  await t.test('3. Tra cứu chứng chỉ công khai (SPEC-CERT-VERIFY-01)', async () => {
    // 3.1 Thêm bản ghi chứng chỉ hợp lệ vào CSDL
    await certColl.insertOne({
      code: testCodeValid,
      user_id: testUserId,
      course_id: testCourseId,
      student_name: 'Nguyễn Văn Minh',
      certificate_name: 'Nguyễn Văn Minh',
      course_title: 'Lập trình Node.js Chuyên Sâu',
      status: 'valid',
      issued_at: new Date(),
      issued_at_vn: '29/10/2026',
      issued_at_en: 'Oct 29, 2026',
      created_at: new Date(),
    });

    // 3.2 Tra cứu mã hợp lệ (TC-VRF-02)
    const result = await verifyCertificateByCode('test-cert-2026'); // test không phân biệt hoa thường
    assert.ok(result);
    assert.equal(result.certificate.code, testCodeValid);
    assert.equal(result.certificate.studentName, 'Nguyễn Văn Minh');
    assert.equal(result.certificate.certificateName, 'Nguyễn Văn Minh');
    assert.ok(result.verifiedAt, 'Phải có trường verifiedAt trả về cho UI');

    // 3.3 Tra cứu mã không tồn tại (TC-VRF-04)
    await assert.rejects(
      async () => {
        await verifyCertificateByCode('KHONG-TON-TAI-999');
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.code, 'CERTIFICATE_NOT_FOUND');
        return true;
      }
    );

    // 3.4 Tra cứu để trống mã
    await assert.rejects(
      async () => {
        await verifyCertificateByCode('');
      },
      (err) => {
        assert.equal(err.status, 400);
        return true;
      }
    );
  });

  await t.test('4. Lấy danh sách chứng chỉ của học viên (SPEC-CERT-MNG-01)', async () => {
    // 4.1 Lấy danh sách thành công
    const list = await getUserCertificates(testUserId);
    assert.ok(Array.isArray(list));
    assert.equal(list.length, 1);
    assert.equal(list[0].code, testCodeValid);

    // 4.2 Học viên chưa có chứng chỉ nào
    const emptyList = await getUserCertificates('unregistered_user_id');
    assert.ok(Array.isArray(emptyList));
    assert.equal(emptyList.length, 0);

    // 4.3 Chưa đăng nhập báo lỗi 401
    await assert.rejects(
      async () => {
        await getUserCertificates(null);
      },
      (err) => {
        assert.equal(err.status, 401);
        return true;
      }
    );
  });

  await t.test('5. Cấp chứng chỉ mới (Claim Certificate)', async () => {
    const newCourseId = 'course_ai_prompt_engineering';
    const cert = await issueCertificateForUser({
      userId: testUserId,
      courseId: newCourseId,
    });

    assert.ok(cert);
    assert.ok(cert.code);
    assert.equal(cert.studentName, cert.certificateName);
    assert.ok(cert.qrUrl.includes(cert.code));

    // Thử claim lại cùng 1 khóa học -> Phải trả về chứng chỉ đã có, không tạo trùng
    const reCert = await issueCertificateForUser({
      userId: testUserId,
      courseId: newCourseId,
    });
    assert.equal(reCert.code, cert.code, 'Không được tạo mã trùng lặp khi claim lại');
  });
});
