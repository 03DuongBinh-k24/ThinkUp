import { 
  getInstructorSettings, 
  updateInstructorProfileTab, 
  updateInstructorAccountTab, 
  updateInstructorPayoutTab 
} from '../services/instructor-settings.service.js';
import { apiSuccess, apiError } from '../utils/response.util.js';
import { getRequestUser } from '../middlewares/route-auth.js';
import { query } from '../models/user.model.js';

/**
 * Helper lấy userId từ request
 */
async function getUserId(req) {
  const user = await getRequestUser(req);
  if (!user) throw new Error('UNAUTHORIZED');

  // The role stored in an existing login token can be older than the current
  // database state. Instructor access is therefore verified against the DB.
  const accessRows = await query(`
    SELECT 1
    FROM users u
    WHERE u.id = ?
      AND (
        u.role IN ('instructor', 'admin')
        OR EXISTS (
          SELECT 1 FROM instructor_applications ia
          WHERE ia.user_id = u.id AND ia.status = 'approved'
        )
        OR EXISTS (
          SELECT 1 FROM course_instructor_members cim
          WHERE cim.user_id = u.id
        )
      )
    LIMIT 1
  `, [user.id]);
  if (!accessRows.length) throw new Error('FORBIDDEN');
  return user.id;
}

function authError(err) {
  if (err.message === 'UNAUTHORIZED') return apiError('Chưa đăng nhập', 401);
  if (err.message === 'FORBIDDEN') return apiError('Bạn không có quyền truy cập tài nguyên này.', 403);
  return null;
}

/**
 * GET /api/instructor/settings
 */
export async function getSettings(req) {
  try {
    const userId = await getUserId(req);
    const data = await getInstructorSettings(userId);
    return apiSuccess(data);
  } catch (err) {
    const response = authError(err);
    if (response) return response;
    return apiError(err.message, 400);
  }
}

/**
 * PUT /api/instructor/settings/profile
 */
export async function updateProfileTab(req) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const result = await updateInstructorProfileTab(userId, body);
    return apiSuccess(result);
  } catch (err) {
    const response = authError(err);
    if (response) return response;
    return apiError(err.message, 400);
  }
}

/**
 * PUT /api/instructor/settings/account
 */
export async function updateAccountTab(req) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const result = await updateInstructorAccountTab(userId, body);
    return apiSuccess(result);
  } catch (err) {
    const response = authError(err);
    if (response) return response;
    return apiError(err.message, 400);
  }
}

/**
 * PUT /api/instructor/settings/payout
 */
export async function updatePayoutTab(req) {
  try {
    const userId = await getUserId(req);
    const body = await req.json();
    const result = await updateInstructorPayoutTab(userId, body);
    return apiSuccess(result);
  } catch (err) {
    const response = authError(err);
    if (response) return response;
    return apiError(err.message, 400);
  }
}
