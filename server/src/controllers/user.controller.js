import { apiSuccess, apiError, buildSetCookie } from '../utils/response.util.js';
import { getTokenFromRequest, verifyToken, signToken } from '../utils/jwt.util.js';
import mysql from 'mysql2/promise';

async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'thinkup_user',
    password: process.env.DB_PASSWORD || 'ThinkUp@2024',
    database: process.env.DB_NAME || 'thinkup',
    timezone: '+07:00'
  });
}

export async function getDashboardData(req, nextAuthUserId) {
  let connection;
  try {
    let userId = nextAuthUserId;

    if (!userId) {
      const token = getTokenFromRequest(req);
      if (!token) return apiError('Chưa đăng nhập.', 401);
      const payload = verifyToken(token);
      userId = payload.sub;
    }

    connection = await getConnection();

    // 1. Get user name
    const [users] = await connection.query('SELECT full_name, avatar_url FROM users WHERE id = ?', [userId]);
    const user = users[0];
    if (!user) return apiError('User not found', 404);

    // 2. Get enrolled courses
    const [enrollments] = await connection.query(`
      SELECT 
        COALESCE(e.progress_percentage, 0) AS progress_percentage,
        c.course_id as id, 
        c.title, 
        c.slug, 
        c.thumbnail_url, 
        c.category_id,
        i.full_name as instructor_name,
        (SELECT COUNT(*) FROM lessons l JOIN course_sections s ON l.section_id = s.section_id WHERE s.course_id = c.course_id) as total_lessons,
        (SELECT COUNT(*) FROM user_lesson_progress ulp WHERE ulp.user_id = ? AND ulp.course_id = c.course_id AND ulp.is_completed = 1) as completed_lessons
      FROM courses c
      LEFT JOIN user_enrollments e ON e.course_id = c.course_id AND e.user_id = ?
      LEFT JOIN course_instructor_members member ON member.course_id = c.course_id AND member.user_id = ?
      LEFT JOIN instructor_profiles i ON c.instructor_id = i.instructor_id
      WHERE e.user_id IS NOT NULL
        OR (member.user_id IS NOT NULL AND c.status = 'published')
      ORDER BY COALESCE(e.last_accessed_at, member.updated_at, member.created_at) DESC
    `, [userId, userId, userId, userId]);

    const myCourses = enrollments.map(e => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      instructor: e.instructor_name || 'Giảng viên ẩn danh',
      progress: e.progress_percentage,
      totalLessons: e.total_lessons,
      completedLessons: e.completed_lessons,
      href: `/learning/learn/${e.slug}`,
      image: e.thumbnail_url || '/assets/landing/course-default.jpg',
      visualBg: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', // mockup styles fallback
      icon: '🎓',
      color: '#3b82f6',
      iconClass: 'text-white'
    }));

    // 3. Get saved roadmap
    const [roadmaps] = await connection.query(`
      SELECT * FROM user_roadmaps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `, [userId]);
    const savedRoadmap = roadmaps[0] ? { 
      title: roadmaps[0].title,
      status: roadmaps[0].status,
      progress_percentage: roadmaps[0].progress_percentage,
      courses: roadmaps[0].courses
    } : null;

    // 4. Get streaks (last 180 days for trend calculation)
    const [streaks] = await connection.query(`
      SELECT DATE_FORMAT(study_date, '%Y-%m-%d') as date, duration_minutes, is_streak_day 
      FROM user_learning_streaks 
      WHERE user_id = ? AND study_date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
      ORDER BY study_date DESC
    `, [userId]);

    let newToken = null;
    if (!nextAuthUserId && userId) {
      // Refresh the thinkup_token
      const [currentUserRows] = await connection.query('SELECT email, role FROM users WHERE id = ?', [userId]);
      if (currentUserRows[0]) {
        newToken = signToken({ sub: userId, email: currentUserRows[0].email, role: currentUserRows[0].role }, '5d');
      }
    }

    const res = apiSuccess({
      user: { full_name: user.full_name, avatar_url: user.avatar_url },
      myCourses,
      savedRoadmap,
      streaks
    });

    if (newToken) {
      res.headers.set('Set-Cookie', buildSetCookie(newToken, 5 * 24 * 3600));
    }

    return res;
  } catch (err) {
    console.error('getDashboardData error:', err);
    return apiError(err.message, 500);
  } finally {
    if (connection) await connection.end();
  }
}

export async function saveUserRoadmap(req, nextAuthUserId) {
  let connection;
  try {
    let userId = nextAuthUserId;
    if (!userId) {
      const token = getTokenFromRequest(req);
      if (!token) return apiError('Chưa đăng nhập.', 401);
      const payload = verifyToken(token);
      userId = payload.sub;
    }

    const { title, roadmapId } = await req.json();
    if (!title?.trim() || !roadmapId?.trim()) return apiError('Thiếu thông tin lộ trình.', 400);

    connection = await getConnection();

    const [updated] = await connection.query(`
      UPDATE user_roadmaps
      SET title = ?, courses = ?, status = 'not_started', progress_percentage = 0
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [title.trim(), JSON.stringify({ roadmapId }), userId]);

    if (updated.affectedRows === 0) {
      await connection.query(`
        INSERT INTO user_roadmaps (user_id, title, courses, status, progress_percentage)
        VALUES (?, ?, ?, 'not_started', 0)
      `, [userId, title.trim(), JSON.stringify({ roadmapId })]);
    }

    return apiSuccess({ message: 'Lưu lộ trình thành công' });
  } catch (err) {
    console.error('saveUserRoadmap error:', err);
    return apiError(err.message, 500);
  } finally {
    if (connection) await connection.end();
  }
}

export async function deleteUserRoadmap(req, nextAuthUserId) {
  let connection;
  try {
    let userId = nextAuthUserId;
    if (!userId) {
      const token = getTokenFromRequest(req);
      if (!token) return apiError('Chưa đăng nhập.', 401);
      const payload = verifyToken(token);
      userId = payload.sub;
    }

    connection = await getConnection();

    await connection.query(`
      DELETE FROM user_roadmaps WHERE user_id = ?
    `, [userId]);

    return apiSuccess({ message: 'Xóa lộ trình thành công' });
  } catch (err) {
    console.error('deleteUserRoadmap error:', err);
    return apiError(err.message, 500);
  } finally {
    if (connection) await connection.end();
  }
}

export async function updateUserRoadmapProgress(req, nextAuthUserId) {
  let connection;
  try {
    let userId = nextAuthUserId;
    if (!userId) {
      const token = getTokenFromRequest(req);
      if (!token) return apiError('Chưa đăng nhập.', 401);
      const payload = verifyToken(token);
      userId = payload.sub;
    }

    const { roadmapId, roadmapData, progress_percentage, status } = await req.json();
    const progress = Number(progress_percentage);
    if (!roadmapId?.trim() || !roadmapData || !Number.isFinite(progress) || progress < 0 || progress > 100) {
      return apiError('Dữ liệu tiến độ không hợp lệ.', 400);
    }
    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      return apiError('Trạng thái tiến độ không hợp lệ.', 400);
    }

    connection = await getConnection();

    const [result] = await connection.query(`
      UPDATE user_roadmaps 
      SET courses = ?, status = ?, progress_percentage = ?
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [JSON.stringify({ roadmapId, data: roadmapData }), status, progress, userId]);

    if (result.affectedRows === 0) return apiError('Lộ trình chưa được đăng ký.', 404);

    return apiSuccess({ message: 'Cập nhật tiến độ thành công' });
  } catch (err) {
    console.error('updateUserRoadmapProgress error:', err);
    return apiError(err.message, 500);
  } finally {
    if (connection) await connection.end();
  }
}
