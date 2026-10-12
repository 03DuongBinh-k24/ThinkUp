/**
 * ThinkUp Backend User - Authentication Aggregate Module
 * Kết hợp 3 mô-đun chức năng độc lập:
 * - signup.user.js: Đăng ký học viên (5 trường + Verification link 12h + JIT OAuth)
 * - signin.user.js: Đăng nhập học viên (Email/Password + Remember Me + Brute-force + Identity Linking)
 * - forgot-password.user.js: Quên mật khẩu qua OTP 6 số (5 phút, Cooldown 60s, hủy sau 5 lần sai)
 */

export * from './db.js';
export * from './signup.user.js';
export * from './signin.user.js';
export * from './forgot-password.user.js';
