export const environment = {
  production: true,
  /** Hạ tầng backend của ThinkUp (theo xác nhận của chủ dự án). */
  apiUrl: 'https://be-thinkup.vercel.app/api',
  /** Production luôn gọi API thật, không dùng mock. */
  adminDataSource: 'http' as 'http' | 'mock',
  adminDemoLogin: false,
  adminDemoAuthFlow: {
    twoFactorEnabled: false,
    twoFactorCode: '',
    passwordDaysLeft: null as number | null,
    setupRequired: false
  }
};
