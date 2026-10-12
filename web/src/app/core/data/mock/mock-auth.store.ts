// TODO(pre-deploy): Nhớ xóa kho tài khoản trình duyệt này khi API xác thực và onboarding thật hoạt động.
import { StudentPreferences, User } from '../../models/user.model';
import { INITIAL_MOCK_USERS, MockUser } from './mock-users';

const STORAGE_KEY = 'thinkup_mock_db_users';
const SOCIAL_STORAGE_KEY = 'thinkup_mock_social_users';

function getSocialUsers(): User[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SOCIAL_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored as User[] : [];
  } catch { return []; }
}

export function getMockSocialUser(seed: User): User {
  if (typeof localStorage === 'undefined') return seed;
  const users = getSocialUsers();
  const existing = users.find(user => user.id === seed.id && user.email === seed.email);
  if (existing) return existing;
  localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify([...users, seed]));
  return seed;
}

export function getMockUsers(): MockUser[] {
  if (typeof localStorage === 'undefined') return INITIAL_MOCK_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored: unknown = JSON.parse(raw);
      if (Array.isArray(stored)) {
        const users = stored as MockUser[];
        const missing = INITIAL_MOCK_USERS.filter(seed => !users.some(user => user.id === seed.id || user.email === seed.email));
        if (missing.length) {
          const updated = [...users, ...missing];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        }
        return users;
      }
    }
  } catch { /* Dữ liệu thử nghiệm lỗi định dạng được khởi tạo lại. */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_USERS));
  return INITIAL_MOCK_USERS;
}

export function addMockUser(user: MockUser): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...getMockUsers(), user]));
}

export function toMockLoginUser(user: MockUser): User {
  const { password: _password, repeatOnboardingOnLogin: _repeat, ...account } = user;
  const repeatForTest = INITIAL_MOCK_USERS.some(seed => seed.id === user.id && seed.repeatOnboardingOnLogin);
  return { ...account, onboarding_completed: repeatForTest ? false : account.onboarding_completed };
}

export function isMockAccount(user: User): boolean {
  return getMockUsers().some(account => account.id === user.id) ||
    getSocialUsers().some(account => account.id === user.id && account.email === user.email);
}

export function saveMockOnboarding(user: User, preferences?: StudentPreferences): void {
  if (typeof localStorage === 'undefined') return;
  const users = getMockUsers();
  const index = users.findIndex(account => account.id === user.id);
  if (index >= 0) {
    const updated = [...users];
    updated[index] = { ...updated[index], onboarding_completed: true };
    if (preferences) updated[index].preferences = preferences;
    else delete updated[index].preferences;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return;
  }
  const socialUsers = getSocialUsers();
  const socialIndex = socialUsers.findIndex(account => account.id === user.id && account.email === user.email);
  if (socialIndex < 0) return;
  const updated = [...socialUsers];
  updated[socialIndex] = { ...updated[socialIndex], onboarding_completed: true };
  if (preferences) updated[socialIndex].preferences = preferences;
  else delete updated[socialIndex].preferences;
  localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify(updated));
}
