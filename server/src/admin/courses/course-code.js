const PREFIX_BY_CATEGORY = Object.freeze({
  1: 'FE', 2: 'BE', 3: 'FS', 4: 'MOB', 5: 'QA', 6: 'BA', 7: 'PM', 8: 'PRD', 9: 'DEV',
  10: 'CLD', 11: 'DA', 12: 'DE', 13: 'AI', 14: 'UX', 15: 'ERP', 16: 'SA', 17: 'SEC',
});
export const FALLBACK_COURSE_CODE_PREFIX = 'GEN';
export const COURSE_CODE_COUNTERS = 'course_code_counters';
export const COURSE_CODE_PATTERN = /^[A-Z]{2,3}\d{3,}$/;

export function courseCodePrefix(categoryId) {
  return PREFIX_BY_CATEGORY[String(categoryId ?? '').trim()] || FALLBACK_COURSE_CODE_PREFIX;
}
export function formatCourseCode(prefix, sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error('Invalid course code sequence.');
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

export async function ensureCourseCodeIndex(db) {
  await db.collection('courses').createIndex({ course_code: 1 }, { unique: true, sparse: true, name: 'course_code_unique' });
}

async function nextSequence(db, prefix, session) {
  const result = await db.collection(COURSE_CODE_COUNTERS).findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after', session },
  );
  const doc = result?.value !== undefined && result?.seq === undefined ? result.value : result;
  if (!Number.isSafeInteger(doc?.seq)) throw new Error('Course code counter unavailable.');
  return doc.seq;
}

// Codes are immutable once assigned so published images and documents keep matching, even if the category changes.
export async function assignCourseCode(db, course, session) {
  if (!course?._id) throw new Error('Course must be persisted before assigning a code.');
  if (course.course_code) return course.course_code;
  const code = formatCourseCode(courseCodePrefix(course.category_id), await nextSequence(db, courseCodePrefix(course.category_id), session));
  const result = await db.collection('courses').updateOne(
    { _id: course._id, course_code: { $exists: false } },
    { $set: { course_code: code } },
    { session },
  );
  if (result.matchedCount === 0) {
    const current = await db.collection('courses').findOne({ _id: course._id }, { projection: { course_code: 1 }, session });
    if (current?.course_code) return current.course_code;
    throw new Error('Course not found while assigning code.');
  }
  return code;
}
