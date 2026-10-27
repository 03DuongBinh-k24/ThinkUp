export const environment = {
  production: true,
  apiUrl: 'https://thinkup-production-b2bd.up.railway.app/api',
  // Tắt demo trên production — dùng tài khoản thật trong collection `admins`.
  adminDemoLogin: false,
  adminDemoAuthFlow: {
    twoFactorEnabled: false,
    twoFactorCode: '',
    passwordDaysLeft: null as number | null,
    setupRequired: false
  }
};
