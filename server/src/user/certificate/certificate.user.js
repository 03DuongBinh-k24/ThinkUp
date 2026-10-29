import { ObjectId } from 'mongodb';
import { getMongoDb } from '../db.js';

// ─── 0. Tên Collection MongoDB ───────────────────────────────────────────────
export const COLLECTION_CERTIFICATES = 'certificates';
export const COLLECTION_COURSES = 'courses';
export const COLLECTION_USERS = 'users';
export const COLLECTION_USER_PROGRESS = 'user_course_progress';

// Base URL công khai chuẩn hóa theo hệ thống ThinkUp
export const PUBLIC_WEB_ORIGIN = process.env.CLIENT_URL?.split(',')[0]?.trim()?.replace(/\/+$/, '') || 'https://thinkup.vn';

// ─── 1. Tiện ích Định dạng & Xử lý Thời gian chuẩn Việt Nam (UTC+7) ──────────

/**
 * Lấy chuỗi thời gian xác thực hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh).
 * Định dạng: "HH:mm dd/MM/yyyy" (ví dụ: "14:30 29/10/2026")
 * @param {Date} [date]
 * @returns {string}
 */
export function formatVietnamVerificationTime(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  return `${partMap.hour}:${partMap.minute} ${partMap.day}/${partMap.month}/${partMap.year}`;
}

/**
 * Format ngày cấp theo chuẩn dd/MM/yyyy theo múi giờ Việt Nam
 * @param {Date} [date]
 * @returns {string}
 */
export function formatVietnamIssuedDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }
  return `${partMap.day}/${partMap.month}/${partMap.year}`;
}

/**
 * Format ngày cấp tiếng Anh cho artwork: "MMM d, yyyy" (vd: "May 15, 2026")
 * @param {Date} [date]
 * @returns {string}
 */
export function formatEnglishIssuedDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return formatter.format(date);
}

/**
 * Chuẩn hóa mã chứng chỉ: loại bỏ khoảng trắng thừa và viết hoa
 * @param {string} code
 * @returns {string}
 */
export function normalizeCertificateCode(code) {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

/**
 * Tạo URL tra cứu chứng chỉ (Dùng để gắn vào QR Code của chứng chỉ)
 * Định dạng: https://thinkup.vn/tra-cuu?code={Mã_chứng_chỉ}
 * Khi người dùng dùng camera/Zalo quét, web sẽ tự điền ô input và tự gọi API tra cứu.
 * @param {string} code
 * @returns {string}
 */
export function buildCertificateQrUrl(code) {
  const cleanCode = normalizeCertificateCode(code);
  return `${PUBLIC_WEB_ORIGIN}/tra-cuu?code=${encodeURIComponent(cleanCode)}`;
}

/**
 * Sinh mã chứng chỉ ngẫu nhiên theo định dạng XXXX-XXXX (A-Z, 0-9)
 * @returns {string}
 */
export function generateCertificateCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Tránh 0, O, 1, I gây nhầm lẫn
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${p1}-${p2}`;
}

// ─── 2. Nghiệp vụ Tra cứu & Quản lý Chứng chỉ ──────────────────────────────

/**
 * Chuẩn hóa entity document trong DB sang cấu trúc DTO trả về cho Frontend:
 * - studentName và certificateName hoàn toàn giống nhau (Họ và tên học viên).
 * - Không xuất mã định danh (studentCode).
 * - Chứa qrUrl động phục vụ kết nối artwork / quét mã.
 * @param {Object} doc
 * @returns {Object}
 */
export function formatCertificateDto(doc) {
  if (!doc) return null;
  const name = doc.student_name || doc.studentName || 'Học viên ThinkUp';
  const code = doc.code;
  const qrUrl = doc.qr_url || buildCertificateQrUrl(code);

  return {
    code: code,
    studentName: name,
    certificateName: name, // Đồng nhất studentName và certificateName
    courseTitle: doc.course_title || doc.courseTitle || 'Khóa học ThinkUp',
    issuedAt: doc.issued_at_vn || (doc.issued_at ? formatVietnamIssuedDate(new Date(doc.issued_at)) : ''),
    issuedAtEn: doc.issued_at_en || (doc.issued_at ? formatEnglishIssuedDate(new Date(doc.issued_at)) : ''),
    status: doc.status || 'valid',
    qrUrl: qrUrl, // Cung cấp URL gắn vào QR riêng cho từng chứng chỉ
    pdfDownloadUrl: `/api/v1/certificates/${encodeURIComponent(code)}/download`,
  };
}

/**
 * Tra cứu chứng chỉ công khai theo mã (Không cần đăng nhập).
 * Quy tắc:
 * - Kiểm tra định dạng mã hợp lệ (A-Z, 0-9, gạch ngang).
 * - Tìm kiếm trong CSDL với mã viết hoa và status = 'valid'.
 * - Trả về { certificate, verifiedAt } với verifiedAt theo giờ Việt Nam.
 * @param {string} rawCode
 * @returns {Promise<{ certificate: Object, verifiedAt: string }>}
 */
export async function verifyCertificateByCode(rawCode) {
  const code = normalizeCertificateCode(rawCode);
  if (!code) {
    const error = new Error('Vui lòng cung cấp mã chứng chỉ để tra cứu.');
    error.status = 400;
    error.code = 'INVALID_CODE';
    throw error;
  }

  // Cho phép chữ cái, chữ số và dấu gạch ngang
  if (!/^[A-Z0-9-]+$/.test(code)) {
    const error = new Error(`Không tìm thấy chứng chỉ với mã ${code}`);
    error.status = 404;
    error.code = 'CERTIFICATE_NOT_FOUND';
    throw error;
  }

  const db = await getMongoDb();
  const certDoc = await db.collection(COLLECTION_CERTIFICATES).findOne({
    code: code,
    status: 'valid',
  });

  if (!certDoc) {
    const error = new Error(`Không tìm thấy chứng chỉ với mã ${code}`);
    error.status = 404;
    error.code = 'CERTIFICATE_NOT_FOUND';
    throw error;
  }

  return {
    certificate: formatCertificateDto(certDoc),
    verifiedAt: formatVietnamVerificationTime(new Date()),
  };
}

/**
 * Lấy danh sách chứng chỉ của học viên đang đăng nhập (Private).
 * Sắp xếp theo ngày cấp mới nhất.
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getUserCertificates(userId) {
  if (!userId) {
    const error = new Error('Yêu cầu đăng nhập để xem danh sách chứng chỉ.');
    error.status = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  const db = await getMongoDb();
  let queryUserId = userId;
  try {
    if (ObjectId.isValid(userId)) {
      queryUserId = new ObjectId(userId);
    }
  } catch {
    queryUserId = userId;
  }

  const certDocs = await db.collection(COLLECTION_CERTIFICATES)
    .find({
      $or: [
        { user_id: queryUserId },
        { user_id: String(userId) },
      ],
    })
    .sort({ created_at: -1, issued_at: -1 })
    .toArray();

  return certDocs.map(formatCertificateDto);
}

/**
 * Cấp chứng chỉ mới cho học viên hoàn thành khóa học (Claim Certificate)
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.courseId
 * @returns {Promise<Object>}
 */
export async function issueCertificateForUser({ userId, courseId }) {
  if (!userId) {
    const error = new Error('Yêu cầu đăng nhập để nhận chứng chỉ.');
    error.status = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }
  if (!courseId) {
    const error = new Error('Mã khóa học không được để trống.');
    error.status = 400;
    error.code = 'INVALID_COURSE_ID';
    throw error;
  }

  const db = await getMongoDb();
  let userObjectId = null;
  let courseObjectId = null;

  try {
    if (ObjectId.isValid(userId)) userObjectId = new ObjectId(userId);
    if (ObjectId.isValid(courseId)) courseObjectId = new ObjectId(courseId);
  } catch {
    // Giữ nguyên dạng chuỗi nếu không hợp lệ ObjectId
  }

  // 1. Kiểm tra chứng chỉ đã tồn tại hay chưa
  const existingCert = await db.collection(COLLECTION_CERTIFICATES).findOne({
    $or: [
      { user_id: userObjectId || userId, course_id: courseObjectId || courseId },
      { user_id: String(userId), course_id: String(courseId) },
    ],
  });

  if (existingCert) {
    return formatCertificateDto(existingCert);
  }

  // 2. Tìm thông tin người dùng và khóa học
  const user = await db.collection(COLLECTION_USERS).findOne(
    userObjectId ? { _id: userObjectId } : { id: userId }
  );
  const course = await db.collection(COLLECTION_COURSES).findOne(
    courseObjectId ? { _id: courseObjectId } : { id: courseId }
  );

  const studentName = user?.fullName || user?.name || user?.email || 'Học viên ThinkUp';
  const courseTitle = course?.title || 'Khóa học ThinkUp';

  // 3. Tạo mã ngẫu nhiên duy nhất
  let newCode = generateCertificateCode();
  let duplicate = await db.collection(COLLECTION_CERTIFICATES).findOne({ code: newCode });
  while (duplicate) {
    newCode = generateCertificateCode();
    duplicate = await db.collection(COLLECTION_CERTIFICATES).findOne({ code: newCode });
  }

  const now = new Date();
  const certRecord = {
    code: newCode,
    user_id: userObjectId || userId,
    course_id: courseObjectId || courseId,
    student_name: studentName,
    certificate_name: studentName, // Đồng nhất student_name và certificate_name
    course_title: courseTitle,
    status: 'valid',
    issued_at: now,
    issued_at_vn: formatVietnamIssuedDate(now),
    issued_at_en: formatEnglishIssuedDate(now),
    qr_url: buildCertificateQrUrl(newCode),
    created_at: now,
    updated_at: now,
  };

  await db.collection(COLLECTION_CERTIFICATES).insertOne(certRecord);

  // 4. Đồng bộ vào user_course_progress nếu có
  try {
    await db.collection(COLLECTION_USER_PROGRESS).updateOne(
      {
        $or: [
          { user_id: userObjectId || userId, course_id: courseObjectId || courseId },
          { user_id: String(userId), course_id: String(courseId) },
        ],
      },
      {
        $set: {
          certificate_id: newCode,
          certificate_url: buildCertificateQrUrl(newCode),
          certificate_issued_at: now,
          updated_at: now,
        },
      }
    );
  } catch (syncErr) {
    console.warn('[Certificate Sync Warning]:', syncErr.message);
  }

  return formatCertificateDto(certRecord);
}

// ─── 3. Tạo Express Router Module ──────────────────────────────────────────

/**
 * Khởi tạo Router xử lý cho module Chứng chỉ (SPEC-CERT-MNG-01 & SPEC-CERT-VERIFY-01)
 * @param {import('express')} expressLib
 * @param {Function} requireAuthMiddleware
 * @returns {import('express').Router}
 */
export function createCertificateRouter(expressLib, requireAuthMiddleware) {
  const router = expressLib.Router();

  // 3.1. [Public] Tra cứu chứng chỉ công khai (SPEC-CERT-VERIFY-01)
  // GET /api/v1/certificates/verify?code=...
  router.get('/verify', async (req, res, next) => {
    try {
      const code = req.query.code;
      const result = await verifyCertificateByCode(code);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // 3.2. [Private] Lấy danh sách chứng chỉ cá nhân của học viên (SPEC-CERT-MNG-01)
  // GET /api/v1/certificates/me
  router.get('/me', requireAuthMiddleware, async (req, res, next) => {
    try {
      const userId = req.userId || req.user?.id || req.user?._id;
      const certificates = await getUserCertificates(userId);
      res.json(certificates);
    } catch (err) {
      next(err);
    }
  });

  // 3.3. [Private] Yêu cầu cấp chứng chỉ khi hoàn thành khóa học
  // POST /api/v1/certificates/claim
  router.post('/claim', requireAuthMiddleware, async (req, res, next) => {
    try {
      const userId = req.userId || req.user?.id || req.user?._id;
      const { courseId } = req.body || {};
      const certificate = await issueCertificateForUser({ userId, courseId });
      res.status(201).json({
        success: true,
        message: 'Chứng chỉ đã được cấp thành công.',
        certificate,
      });
    } catch (err) {
      next(err);
    }
  });

  // 3.4. [Public/Private] Xuất / Tải chứng chỉ (Chuẩn tên file ThinkUp_Certificate_{Mã_chứng_chỉ}.pdf)
  // GET /api/v1/certificates/:code/download
  router.get('/:code/download', async (req, res, next) => {
    try {
      const { code } = req.params;
      const result = await verifyCertificateByCode(code);
      const cleanCode = result.certificate.code;

      // Đặt header theo đúng đặc tả BA: ThinkUp_Certificate_{Mã_chứng_chỉ}.pdf
      const fileName = `ThinkUp_Certificate_${cleanCode}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Mock buffer PDF chuẩn header tối thiểu để tải về thành công
      // (Khung sẵn sàng để nối engine render PDF chất lượng cao hoặc stream từ Storage)
      const pdfBuffer = Buffer.from(
        `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 842 595]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF`
      );

      return res.send(pdfBuffer);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
