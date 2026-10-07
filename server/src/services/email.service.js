import { getTransporter, EMAIL_FROM } from '../config/email.config.js';

// ─── Email Templates ──────────────────────────────────────────────────────────

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

/**
 * Gửi email OTP xác thực (đăng ký hoặc quên mật khẩu).
 * @param {string} to
 * @param {string} otp
 * @param {'register'|'reset_password'} purpose
 */
export async function sendOtpEmail(to, otp, purpose = 'register') {
  const isReset = purpose === 'reset_password';
  const subject = isReset ? 'Đặt lại mật khẩu ThinkUp' : 'Xác thực tài khoản ThinkUp';
  const action = isReset ? 'đặt lại mật khẩu' : 'xác thực tài khoản';

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;background:#F8F9FF;font-family:'Inter',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FF;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:16px;overflow:hidden;
                     box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:520px;width:100%;">
              <tr>
                <td style="background:linear-gradient(135deg,#0058BE 0%,#3898EC 100%);
                           padding:32px 40px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                    THINK<span style="color:#A8D8F0;">UP</span>
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#0D1C2D;font-size:20px;font-weight:600;
                             margin:0 0 12px;text-align:center;">
                    ${subject}
                  </h2>
                  <p style="color:#424754;font-size:14px;line-height:1.6;
                            margin:0 0 24px;text-align:center;">
                    Bạn vừa yêu cầu ${action}. Sử dụng mã OTP bên dưới,
                    mã có hiệu lực trong <strong>10 phút</strong>.
                  </p>
                  <div style="background:#F2F3FD;border-radius:12px;padding:24px;
                              text-align:center;margin:0 0 24px;">
                    <span style="font-size:40px;font-weight:800;letter-spacing:12px;
                                 color:#0058BE;font-family:'Courier New',monospace;">
                      ${otp}
                    </span>
                  </div>
                  <p style="color:#727785;font-size:13px;line-height:1.5;
                            text-align:center;margin:0;">
                    Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.<br/>
                    Không chia sẻ mã OTP với bất kỳ ai.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#F8F9FF;padding:20px 40px;text-align:center;
                           border-top:1px solid #E2E8F0;">
                  <p style="color:#9CA3AF;font-size:12px;margin:0;">
                    © 2024 ThinkUp. Nền tảng học tập trực tuyến.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await getTransporter().sendMail({ from: EMAIL_FROM, to, subject, html });
}

/**
 * Gửi email chào mừng sau khi đăng ký thành công.
 * @param {string} to
 * @param {string} name
 */
export async function sendWelcomeEmail(to, name) {
  const subject = `Chào mừng ${name} đến với ThinkUp! 🎉`;

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head><meta charset="UTF-8" /><title>${subject}</title></head>
    <body style="margin:0;padding:0;background:#F8F9FF;font-family:'Inter',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FF;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#fff;border-radius:16px;overflow:hidden;
                     box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:520px;width:100%;">
              <tr>
                <td style="background:linear-gradient(135deg,#0058BE 0%,#3898EC 100%);
                           padding:32px 40px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">
                    THINK<span style="color:#A8D8F0;">UP</span>
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#0D1C2D;font-size:22px;font-weight:600;margin:0 0 16px;text-align:center;">
                    Chào mừng bạn, ${name}! 🚀
                  </h2>
                  <p style="color:#424754;font-size:14px;line-height:1.7;margin:0 0 20px;">
                    Tài khoản của bạn đã được kích hoạt thành công. Hãy bắt đầu hành trình học tập cùng hàng nghìn học viên khác trên ThinkUp!
                  </p>
                  <div style="text-align:center;margin:24px 0;">
                    <a href="${APP_URL}/home"
                       style="background:#0058BE;color:#fff;text-decoration:none;
                              padding:14px 32px;border-radius:8px;font-weight:600;
                              font-size:15px;display:inline-block;">
                      Bắt đầu học ngay →
                    </a>
                  </div>
                  <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
                    © 2024 ThinkUp. Mọi thắc mắc liên hệ: support@thinkup.vn
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await getTransporter().sendMail({ from: EMAIL_FROM, to, subject, html });
}

/**
 * Gửi email thông báo bảo mật sau khi đổi mật khẩu.
 * @param {string} to
 * @param {string} name
 */
export async function sendPasswordChangedEmail(to, name) {
  const subject = 'Mật khẩu tài khoản ThinkUp vừa được thay đổi';

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head><meta charset="UTF-8" /><title>${subject}</title></head>
    <body style="margin:0;padding:0;background:#F8F9FF;font-family:'Inter',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FF;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#fff;border-radius:16px;overflow:hidden;
                     box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:520px;width:100%;">
              <tr>
                <td style="background:linear-gradient(135deg,#0058BE 0%,#3898EC 100%);
                           padding:32px 40px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">
                    THINK<span style="color:#A8D8F0;">UP</span>
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:10px;
                              padding:16px;margin-bottom:24px;text-align:center;">
                    <span style="font-size:24px;">⚠️</span>
                    <p style="color:#92400E;font-weight:600;margin:8px 0 0;font-size:14px;">
                      Cảnh báo bảo mật
                    </p>
                  </div>
                  <p style="color:#0D1C2D;font-size:15px;line-height:1.7;margin:0 0 16px;">
                    Xin chào <strong>${name}</strong>,
                  </p>
                  <p style="color:#424754;font-size:14px;line-height:1.7;margin:0 0 20px;">
                    Mật khẩu tài khoản của bạn vừa được thay đổi thành công lúc <strong>${new Date().toLocaleString('vi-VN')}</strong>.
                  </p>
                  <p style="color:#424754;font-size:14px;line-height:1.7;margin:0 0 20px;">
                    Nếu bạn <strong>không thực hiện</strong> thay đổi này, hãy liên hệ hỗ trợ ngay lập tức.
                  </p>
                  <div style="text-align:center;margin:24px 0;">
                    <a href="mailto:support@thinkup.vn"
                       style="background:#DC2626;color:#fff;text-decoration:none;
                              padding:12px 28px;border-radius:8px;font-weight:600;
                              font-size:14px;display:inline-block;">
                      Liên hệ hỗ trợ khẩn cấp
                    </a>
                  </div>
                  <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
                    © 2024 ThinkUp. Email tự động, vui lòng không reply.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await getTransporter().sendMail({ from: EMAIL_FROM, to, subject, html });
}

/**
 * Gửi email chứa link xác thực tài khoản.
 * @param {string} to
 * @param {string} token
 */
export async function sendVerificationEmail(to, token) {
  const subject = 'Xác thực tài khoản ThinkUp';
  const verifyLink = `${APP_URL}/auth/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head><meta charset="UTF-8" /><title>${subject}</title></head>
    <body style="margin:0;padding:0;background:#F8F9FF;font-family:'Inter',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FF;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#fff;border-radius:16px;overflow:hidden;
                     box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:520px;width:100%;">
              <tr>
                <td style="background:linear-gradient(135deg,#0058BE 0%,#3898EC 100%);
                           padding:32px 40px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">
                    THINK<span style="color:#A8D8F0;">UP</span>
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;text-align:center;">
                  <h2 style="color:#0D1C2D;font-size:22px;font-weight:600;margin:0 0 16px;">
                    Hoàn tất đăng ký
                  </h2>
                  <p style="color:#424754;font-size:14px;line-height:1.7;margin:0 0 24px;">
                    Cảm ơn bạn đã đăng ký tài khoản ThinkUp. Vui lòng nhấn vào nút bên dưới để xác thực email và kích hoạt tài khoản của bạn.
                  </p>
                  <a href="${verifyLink}"
                     style="background:#0058BE;color:#fff;text-decoration:none;
                            padding:14px 32px;border-radius:8px;font-weight:600;
                            font-size:15px;display:inline-block;margin-bottom:24px;">
                    Xác thực email
                  </a>
                  <p style="color:#727785;font-size:13px;line-height:1.5;margin:0;">
                    Link này sẽ hết hạn sau 24 giờ.<br/>
                    Nếu nút không hoạt động, hãy copy đường link sau vào trình duyệt:<br/>
                    <a href="${verifyLink}" style="color:#3898EC;word-break:break-all;">${verifyLink}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await getTransporter().sendMail({ from: EMAIL_FROM, to, subject, html });
}

/**
 * Gửi email xác nhận sau khi user Facebook cập nhật email lần đầu tiên.
 * @param {string} to - email mới của user
 * @param {string} name - tên user
 */
export async function sendEmailUpdatedConfirmation(to, name) {
  const subject = 'Xác nhận email tài khoản ThinkUp';

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head><meta charset="UTF-8" /><title>${subject}</title></head>
    <body style="margin:0;padding:0;background:#F8F9FF;font-family:'Inter',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FF;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#fff;border-radius:16px;overflow:hidden;
                     box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:520px;width:100%;">
              <tr>
                <td style="background:linear-gradient(135deg,#0058BE 0%,#3898EC 100%);
                           padding:32px 40px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                    THINK<span style="color:#A8D8F0;">UP</span>
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <div style="text-align:center;margin-bottom:24px;">
                    <span style="font-size:48px;">✅</span>
                  </div>
                  <h2 style="color:#0D1C2D;font-size:20px;font-weight:600;margin:0 0 12px;text-align:center;">
                    Email đã được liên kết thành công!
                  </h2>
                  <p style="color:#424754;font-size:14px;line-height:1.7;margin:0 0 16px;text-align:center;">
                    Xin chào <strong>${name}</strong>,
                  </p>
                  <p style="color:#424754;font-size:14px;line-height:1.7;margin:0 0 20px;">
                    Địa chỉ email <strong>${to}</strong> đã được liên kết với tài khoản ThinkUp của bạn.
                    Đây là email duy nhất và sẽ <strong>không thể thay đổi</strong> sau này.
                  </p>
                  <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:16px;margin-bottom:24px;">
                    <p style="color:#1E40AF;font-size:13px;margin:0;line-height:1.6;">
                      ℹ️ Nếu bạn không thực hiện thao tác này, vui lòng liên hệ ngay với đội hỗ trợ ThinkUp.
                    </p>
                  </div>
                  <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
                    © 2024 ThinkUp. Mọi thắc mắc liên hệ: support@thinkup.vn
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await getTransporter().sendMail({ from: EMAIL_FROM, to, subject, html });
}
