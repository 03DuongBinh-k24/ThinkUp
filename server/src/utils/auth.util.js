import crypto from 'crypto';

const PASSWORD_RULES = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/,
};
export function validatePassword(password) {
  const errors = [];

  if (!password || password.length < PASSWORD_RULES.minLength) {
    errors.push(`Mật khẩu phải có ít nhất ${PASSWORD_RULES.minLength} ký tự`);
  }
  if (!PASSWORD_RULES.hasUppercase.test(password)) {
    errors.push('Phải có ít nhất 1 chữ hoa (A–Z)');
  }
  if (!PASSWORD_RULES.hasLowercase.test(password)) {
    errors.push('Phải có ít nhất 1 chữ thường (a–z)');
  }
  if (!PASSWORD_RULES.hasNumber.test(password)) {
    errors.push('Phải có ít nhất 1 chữ số (0–9)');
  }
  if (!PASSWORD_RULES.hasSpecial.test(password)) {
    errors.push('Phải có ít nhất 1 ký tự đặc biệt (!@#$%...)');
  }

  return { valid: errors.length === 0, errors };
}
export function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (PASSWORD_RULES.hasUppercase.test(password) && PASSWORD_RULES.hasLowercase.test(password)) score++;
  if (PASSWORD_RULES.hasNumber.test(password)) score++;
  if (PASSWORD_RULES.hasSpecial.test(password)) score++;
  return score;
}
export function containsPersonalInfo(password, { name = '', email = '', phone = '' }) {
  const pw = password.toLowerCase();
  const emailLocal = email.split('@')[0].toLowerCase();
  const nameParts = name.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);

  const checks = [
    emailLocal.length >= 3 && pw.includes(emailLocal),
    phone.length >= 6 && pw.includes(phone.replace(/\D/g, '').slice(-6)),
    nameParts.some((part) => pw.includes(part)),
  ];

  return checks.some(Boolean);
}
export function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}
export function maskEmail(email) {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}
export function maskPhone(phone) {
  if (!phone || phone.length < 6) return '***';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}
