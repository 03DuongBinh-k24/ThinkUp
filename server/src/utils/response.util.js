export function apiSuccess(data = {}, status = 200) {
  return Response.json({ success: true, ...data }, { status });
}
export function apiError(message, status = 400, extra = {}) {
  return Response.json({ success: false, message, ...extra }, { status });
}

const COOKIE_NAME = 'thinkup_token';
const COOKIE_OPTS = [
  'HttpOnly',
  'Path=/',
  'SameSite=Lax',
  process.env.NODE_ENV === 'production' ? 'Secure' : '',
].filter(Boolean);
export function buildSetCookie(token, maxAgeSeconds = 7 * 24 * 3600) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Max-Age=${maxAgeSeconds}`,
    ...COOKIE_OPTS,
  ].join('; ');
}
export function buildClearCookie() {
  return [`${COOKIE_NAME}=`, 'Max-Age=0', ...COOKIE_OPTS].join('; ');
}
