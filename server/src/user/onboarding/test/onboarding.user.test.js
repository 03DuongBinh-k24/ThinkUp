import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { getMongoDb, closeMongoDb } from '../../db.js';
import {
  skipOnboarding,
  submitOnboarding,
  getOnboardingCourseList,
} from '../onboarding.user.js';

// ─── Test Suite chạy trực tiếp trên Database Thật (MongoDB Atlas) ─────────────

describe('Khảo Sát Onboarding với Database Thật (MongoDB Atlas)', () => {
  let db;
  let testUserId;
  let testUserIdStr;

  before(async () => {
    db = await getMongoDb();
    testUserId = new ObjectId();
    testUserIdStr = testUserId.toString();

    // Đảm bảo không còn bản ghi cũ nếu test trước đó bị gián đoạn
    await db.collection('users').deleteMany({ email: 'test_onboarding_runner@thinkup.vn' });

    // Tạo học viên kiểm thử tạm thời trong collection users
    await db.collection('users').insertOne({
      _id: testUserId,
      email: 'test_onboarding_runner@thinkup.vn',
      full_name: 'Test Onboarding Runner',
      role: 'student',
      status: 'active',
      onboarding_completed: false,
      created_at: new Date(),
    });
  });

  after(async () => {
    // Dọn dẹp bản ghi kiểm thử trong database thật sau khi hoàn tất
    if (db && testUserId) {
      await db.collection('users').deleteOne({ _id: testUserId });
      await db.collection('student_onboarding_answers').deleteOne({ user_id: testUserId });
    }
    await closeMongoDb();
  });

  beforeEach(async () => {
    // Đặt lại trạng thái test user trước mỗi test
    await db.collection('users').updateOne(
      { _id: testUserId },
      { $set: { onboarding_completed: false } }
    );
    await db.collection('student_onboarding_answers').deleteOne({ user_id: testUserId });
  });

  describe('skipOnboarding() trên DB thật', () => {
    it('TC-SKIP-01: Trả về toàn bộ khóa học thật theo thứ tự mặc định, cập nhật onboarding_completed = true', async () => {
      const result = await skipOnboarding(testUserIdStr, { db });

      assert.ok(result.message);
      assert.ok(Array.isArray(result.courses));
      assert.ok(result.courses.length > 0, 'Phải trả về danh sách khóa học thực tế từ database');

      // Xác nhận trong CSDL thật: onboarding_completed = true
      const user = await db.collection('users').findOne({ _id: testUserId });
      assert.strictEqual(user.onboarding_completed, true);

      // Xác nhận KHÔNG lưu bất kỳ lựa chọn nào vào CSDL thật
      const answer = await db.collection('student_onboarding_answers').findOne({ user_id: testUserId });
      assert.strictEqual(answer, null, 'Không được lưu bản ghi khảo sát khi bấm Bỏ qua');
    });

    it('TC-SKIP-02: Không lưu lựa chọn vào CSDL khi bỏ qua', async () => {
      await skipOnboarding(testUserIdStr, { db });
      const answer = await db.collection('student_onboarding_answers').findOne({ user_id: testUserId });
      assert.strictEqual(answer, null);
    });

    it('TC-SKIP-03: Báo lỗi 401 khi không truyền userId', async () => {
      await assert.rejects(
        () => skipOnboarding('', { db }),
        (err) => err.status === 401
      );
    });

    it('TC-SKIP-04: Báo lỗi 400 khi userId không phải ObjectId hợp lệ', async () => {
      await assert.rejects(
        () => skipOnboarding('invalid_id', { db }),
        (err) => err.status === 400
      );
    });

    it('TC-SKIP-05: Báo lỗi 404 khi userId không tồn tại trong database thật', async () => {
      const nonExistent = new ObjectId().toString();
      await assert.rejects(
        () => skipOnboarding(nonExistent, { db }),
        (err) => err.status === 404
      );
    });
  });

  describe('submitOnboarding() trên DB thật', () => {
    const VALID_ANSWERS = {
      categoryId: '1', // Frontend Developer
      selectedTagIds: ['3', '4'], // Tag thực tế từ database
      level: 'beginner',
    };

    it('TC-SUB-01: Lưu lựa chọn vào student_onboarding_answers thật + cập nhật user + trả về courses', async () => {
      const result = await submitOnboarding(testUserIdStr, VALID_ANSWERS, { db });

      assert.ok(result.message);
      assert.ok(result.preferences);
      assert.strictEqual(result.preferences.categoryId, '1');
      assert.deepEqual(result.preferences.selectedTagIds, ['3', '4']);
      assert.strictEqual(result.preferences.level, 'beginner');

      // Kiểm tra bản ghi thật trong CSDL
      const saved = await db.collection('student_onboarding_answers').findOne({ user_id: testUserId });
      assert.ok(saved, 'Bản ghi khảo sát phải được lưu vào CSDL thật');
      assert.strictEqual(saved.category_id, '1');
      assert.deepEqual(saved.selected_tag_ids, ['3', '4']);
      assert.strictEqual(saved.level, 'beginner');

      // Kiểm tra cờ onboarding_completed trong CSDL thật
      const user = await db.collection('users').findOne({ _id: testUserId });
      assert.strictEqual(user.onboarding_completed, true);

      // Danh sách khóa học được trả về
      assert.ok(Array.isArray(result.courses));
      assert.ok(result.courses.length > 0);
    });

    it('TC-SUB-02: Không dùng bộ lọc cứng loại bỏ — bảo toàn toàn bộ khóa học published', async () => {
      const publishedCount = await db.collection('courses').countDocuments({ status: 'published' });
      const result = await submitOnboarding(testUserIdStr, VALID_ANSWERS, { db });

      assert.strictEqual(
        result.courses.length,
        publishedCount,
        'Số lượng khóa học trả về phải bằng chính xác tổng số khóa học published trong CSDL thật'
      );
    });

    it('TC-SUB-03: Sắp xếp ưu tiên: khóa học thỏa tiêu chí khảo sát phải xuất hiện ở nhóm đầu', async () => {
      const result = await submitOnboarding(testUserIdStr, VALID_ANSWERS, { db });
      const courses = result.courses;

      // Tìm khóa học khớp category_id='1' và level='beginner'
      const matchedIdx = courses.findIndex(
        (c) => c.category_id === '1' && (c.level || '').toLowerCase() === 'beginner'
      );
      // Tìm khóa học hoàn toàn khác category và khác level
      const unmatchedIdx = courses.findLastIndex(
        (c) => c.category_id !== '1'
      );

      if (matchedIdx !== -1 && unmatchedIdx !== -1) {
        assert.ok(
          matchedIdx < unmatchedIdx,
          `Khóa học phù hợp (vị trí ${matchedIdx}) phải xếp trước khóa học không phù hợp (vị trí ${unmatchedIdx})`
        );
      }
    });

    it('TC-SUB-04: Báo lỗi 400 khi thiếu categoryId', async () => {
      await assert.rejects(
        () => submitOnboarding(testUserIdStr, { selectedTagIds: ['3'], level: 'beginner' }, { db }),
        (err) => err.status === 400 && err.field === 'categoryId'
      );
    });

    it('TC-SUB-05: Báo lỗi 400 khi categoryId không hợp lệ (ngoài 1–17)', async () => {
      await assert.rejects(
        () => submitOnboarding(testUserIdStr, { ...VALID_ANSWERS, categoryId: '999' }, { db }),
        (err) => err.status === 400 && err.field === 'categoryId'
      );
    });

    it('TC-SUB-06: Báo lỗi 400 khi selectedTagIds rỗng []', async () => {
      await assert.rejects(
        () => submitOnboarding(testUserIdStr, { ...VALID_ANSWERS, selectedTagIds: [] }, { db }),
        (err) => err.status === 400 && err.field === 'selectedTagIds'
      );
    });

    it('TC-SUB-07: Báo lỗi 400 khi selectedTagIds vượt quá 3 kỹ năng', async () => {
      await assert.rejects(
        () =>
          submitOnboarding(
            testUserIdStr,
            { ...VALID_ANSWERS, selectedTagIds: ['1', '2', '3', '4'] },
            { db }
          ),
        (err) => err.status === 400 && err.field === 'selectedTagIds'
      );
    });

    it('TC-SUB-08: Báo lỗi 400 khi thiếu level', async () => {
      await assert.rejects(
        () => submitOnboarding(testUserIdStr, { categoryId: '1', selectedTagIds: ['3'] }, { db }),
        (err) => err.status === 400 && err.field === 'level'
      );
    });

    it('TC-SUB-09: Báo lỗi 400 khi level không hợp lệ', async () => {
      await assert.rejects(
        () => submitOnboarding(testUserIdStr, { ...VALID_ANSWERS, level: 'unreal_level' }, { db }),
        (err) => err.status === 400 && err.field === 'level'
      );
    });

    it('TC-SUB-10: Báo lỗi 401 khi userId rỗng', async () => {
      await assert.rejects(
        () => submitOnboarding('', VALID_ANSWERS, { db }),
        (err) => err.status === 401
      );
    });

    it('TC-SUB-11: Báo lỗi 404 khi userId không tồn tại', async () => {
      const nonExistent = new ObjectId().toString();
      await assert.rejects(
        () => submitOnboarding(nonExistent, VALID_ANSWERS, { db }),
        (err) => err.status === 404
      );
    });

    it('TC-SUB-12: Trùng selectedTagIds được tự động khử trùng lặp', async () => {
      const result = await submitOnboarding(
        testUserIdStr,
        { ...VALID_ANSWERS, selectedTagIds: ['3', '3', '4'] },
        { db }
      );
      assert.deepEqual(result.preferences.selectedTagIds, ['3', '4']);
    });
  });

  describe('getOnboardingCourseList() trên DB thật', () => {
    it('TC-GET-01: Trả về danh sách theo thứ tự mặc định khi chưa làm khảo sát', async () => {
      const result = await getOnboardingCourseList(testUserIdStr, { db });
      assert.ok(Array.isArray(result.courses));
      assert.ok(result.courses.length > 0);
      assert.strictEqual(result.preferences, null);
    });

    it('TC-GET-02: Trả về danh sách sắp xếp theo ưu tiên khi đã có kết quả khảo sát trong DB thật', async () => {
      await submitOnboarding(
        testUserIdStr,
        { categoryId: '1', selectedTagIds: ['3'], level: 'beginner' },
        { db }
      );

      const result = await getOnboardingCourseList(testUserIdStr, { db });
      assert.ok(result.preferences);
      assert.strictEqual(result.preferences.categoryId, '1');
      assert.ok(Array.isArray(result.courses));
      assert.ok(result.courses.length > 0);
    });

    it('TC-GET-03: Báo lỗi 401 khi userId rỗng', async () => {
      await assert.rejects(
        () => getOnboardingCourseList('', { db }),
        (err) => err.status === 401
      );
    });

    it('TC-GET-04: Báo lỗi 404 khi userId không tồn tại', async () => {
      const nonExistent = new ObjectId().toString();
      await assert.rejects(
        () => getOnboardingCourseList(nonExistent, { db }),
        (err) => err.status === 404
      );
    });

    it('TC-GET-05: Khóa học trả về có đủ các trường chuẩn theo schema database thật', async () => {
      const result = await getOnboardingCourseList(testUserIdStr, { db });
      const course = result.courses[0];

      assert.ok('id' in course);
      assert.ok('course_id' in course);
      assert.ok('title' in course);
      assert.ok('category_id' in course);
      assert.ok('level' in course);
      assert.ok('price' in course);
      assert.ok('total_students' in course);
      assert.ok('rating' in course);
      assert.ok('tag_ids' in course);
    });
  });
});
