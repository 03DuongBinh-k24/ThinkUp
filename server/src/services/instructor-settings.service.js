import { findUserById, updateUserFullName, updateUserPhone, updatePassword, query } from '../models/user.model.js';
import { getProfileByUserId, upsertInstructorProfile } from '../models/instructor-profile.model.js';
import bcrypt from 'bcryptjs';

/**
 * Lấy toàn bộ settings của giảng viên (cả bảng users và instructor_profiles)
 */
export async function getInstructorSettings(userId) {
  const settingsQueries = Promise.all([
    findUserById(userId),
    getProfileByUserId(userId),
    query("SELECT * FROM instructor_applications WHERE user_id=? AND status='approved' LIMIT 1", [userId]),
    query(`SELECT COALESCE(SUM((CASE WHEN t.discount_type='thinkup' THEN t.original_price ELSE t.paid_amount END)*0.6),0) available
      FROM instructor_revenue_transactions t JOIN course_instructor_members m ON m.course_id=t.course_id WHERE m.user_id=? AND t.status='success' AND YEAR(t.paid_at)=YEAR(CURRENT_DATE()) AND MONTH(t.paid_at)=MONTH(CURRENT_DATE())`, [userId]),
    query(`SELECT DATE_FORMAT(DATE_ADD(MAX(t.paid_at),INTERVAL 1 MONTH),'%Y-%m-05') date,
      SUM((CASE WHEN t.discount_type='thinkup' THEN t.original_price ELSE t.paid_amount END)*0.6) amount
      FROM instructor_revenue_transactions t JOIN course_instructor_members m ON m.course_id=t.course_id
      WHERE m.user_id=? AND t.status='success' AND t.paid_at<DATE_FORMAT(CURRENT_DATE(),'%Y-%m-01') GROUP BY YEAR(t.paid_at),MONTH(t.paid_at) ORDER BY date DESC`, [userId]),
    query('SELECT MIN(c.created_at) firstCreated FROM courses c JOIN course_instructor_members m ON m.course_id=c.course_id WHERE m.user_id=?', [userId]),
  ]);
  const [user, profile, applications, revenueRows, payoutRows, firstCourses] = await settingsQueries;
  if (!user) throw new Error('Không tìm thấy người dùng');

  const application = applications[0] || {};
  const now = new Date(); const nextPayout = new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 5 ? 1 : 0), 5);

  return {
    user: {
      fullName: user.full_name || application.display_name || '',
      email: user.email,
      phone: user.phone || application.phone || '',
      avatar: user.avatar_url,
    },
    profile: profile ? {
      title: profile.title || application.professional_title || profile.specialization || '',
      bio: profile.bio || application.bio || '',
      website: profile.website || '',
      facebook: profile.facebook || '',
      youtube: profile.youtube || '',
      instagram: profile.instagram || '',
      payoutMethod: profile.payout_method || 'bank',
      bankName: profile.bank_name || '',
      bankAccountName: profile.bank_account_name || '',
      bankAccountNumber: profile.bank_account_number || '',
      bankBranch: profile.bank_branch || '',
      paypalEmail: profile.paypal_email || '',
      paypalLinkEmail: profile.paypal_link_email || '',
      paypalLinkStatus: profile.paypal_link_status || '',
      autoPayoutThreshold: profile.auto_payout_threshold ?? 5000000,
      autoPayoutEnabled: Boolean(profile.auto_payout_enabled),
      availableRevenue: Number(revenueRows[0]?.available) || 0,
      nextPayoutDate: nextPayout.toISOString().slice(0,10),
      firstCourseCreatedAt: firstCourses[0]?.firstCreated || null,
      payoutHistory: payoutRows.map((row,index)=>({id:`WD-${String(index+1).padStart(4,'0')}`,date:row.date,amount:Number(row.amount)||0,bank:`${profile.bank_name||'Bank'} (***${String(profile.bank_account_number||'0000').slice(-4)})`,status:'success'})),
    } : null
  };
}

/**
 * Cập nhật tab Hồ sơ
 */
export async function updateInstructorProfileTab(userId, payload) {
  const { fullName, title, bio, website, facebook, youtube, instagram, avatarUrl } = payload;
  
  if (fullName) {
    await updateUserFullName(userId, fullName);
  }
  if (avatarUrl) {
    await query('UPDATE users SET avatar_url=? WHERE id=?', [avatarUrl, userId]);
  }

  await upsertInstructorProfile(userId, {
    title,
    bio,
    website,
    facebook,
    youtube,
    instagram
  });

  return { success: true };
}

/**
 * Cập nhật tab Tài khoản & Bảo mật
 */
export async function updateInstructorAccountTab(userId, payload) {
  const { phone, currentPassword, newPassword, confirmPassword } = payload;
  const isChangingPassword = Boolean(newPassword || confirmPassword);

  if (isChangingPassword) {
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error('Không thể lưu thay đổi vì thông tin mật khẩu chưa đầy đủ');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('Không thể lưu thay đổi vì mật khẩu xác nhận không trùng khớp');
    }
    // Để đổi mật khẩu, cần lấy user có password_hash
    // Vì findUserById ở user.model.js không lấy password_hash, ta query thủ công hoặc thêm hàm
    const { query } = await import('../models/user.model.js');
    const rows = await query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = rows[0];
    
    if (!user) throw new Error('Không thể lưu thay đổi vì không tìm thấy tài khoản người dùng');
    if (!user.password_hash) throw new Error('Không thể lưu thay đổi vì tài khoản này không đăng nhập bằng mật khẩu');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new Error('Không thể lưu thay đổi vì mật khẩu hiện tại không chính xác');

    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new Error('Không thể lưu thay đổi vì mật khẩu mới trùng mật khẩu hiện tại');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    
    await updatePassword(userId, newHash);
  }

  // Chỉ cập nhật các trường khác sau khi toàn bộ kiểm tra mật khẩu thành công.
  if (phone !== undefined) {
    await updateUserPhone(userId, phone);
  }

  return { success: true };
}

/**
 * Cập nhật tab Thanh toán & Rút tiền
 */
export async function updateInstructorPayoutTab(userId, payload) {
  const { 
    payoutMethod, 
    bankName, bankAccountName, bankAccountNumber, bankBranch, 
    paypalEmail, paypalLinkEmail, paypalLinkStatus,
    autoPayoutThreshold, autoPayoutEnabled 
  } = payload;

  const data = {
    payout_method: payoutMethod,
    bank_name: bankName,
    bank_account_name: bankAccountName,
    bank_account_number: bankAccountNumber,
    bank_branch: bankBranch,
    paypal_email: paypalEmail,
    paypal_link_email: paypalLinkEmail,
    paypal_link_status: paypalLinkStatus,
  };

  if (autoPayoutThreshold !== undefined) {
    data.auto_payout_threshold = autoPayoutThreshold === '' ? 0 : Number(autoPayoutThreshold);
    if (autoPayoutThreshold === '') data.auto_payout_enabled = 0;
  }
  
  if (autoPayoutEnabled !== undefined) {
    data.auto_payout_enabled = autoPayoutEnabled ? 1 : 0;
  }

  await upsertInstructorProfile(userId, data);
  
  return { success: true };
}
