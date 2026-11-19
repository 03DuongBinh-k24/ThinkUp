import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';
import { assignCourseCode, courseCodePrefix, formatCourseCode, COURSE_CODE_PATTERN } from '../course-code.js';
import { listAdminCourses } from '../courses.admin.js';

function memoryDb(courses = []) {
  const counters = new Map();
  const rows = courses.map(c => ({ _id: new ObjectId(), ...c }));
  const match = (row, q) => Object.entries(q).every(([k, v]) => v && typeof v === 'object' && '$exists' in v ? (row[k] !== undefined) === v.$exists : String(row[k]) === String(v));
  const coursesCol = {
    rows,
    find: () => { const cursor = { sort: () => cursor, toArray: async () => rows }; return cursor; },
    async findOne(q) { return rows.find(r => match(r, q)) || null; },
    async updateOne(q, u) { const r = rows.find(x => match(x, q)); if (!r) return { matchedCount: 0 }; Object.assign(r, u.$set); return { matchedCount: 1 }; },
  };
  const countersCol = {
    async findOneAndUpdate({ _id }) { await Promise.resolve(); const seq = (counters.get(_id) || 0) + 1; counters.set(_id, seq); return { _id, seq }; },
  };
  return { rows, collection: name => (name === 'courses' ? coursesCol : name === 'course_code_counters' ? countersCol : { find: () => ({ toArray: async () => [] }) }) };
}

test('prefix follows category and falls back to GEN', () => {
  assert.equal(courseCodePrefix('1'), 'FE');
  assert.equal(courseCodePrefix(4), 'MOB');
  assert.equal(courseCodePrefix('Lập trình'), 'GEN');
  assert.equal(courseCodePrefix(undefined), 'GEN');
});

test('format has no separator and pads to 3 digits', () => {
  assert.equal(formatCourseCode('MOB', 1), 'MOB001');
  assert.equal(formatCourseCode('FE', 1234), 'FE1234');
  assert.match(formatCourseCode('SEC', 5), COURSE_CODE_PATTERN);
  assert.throws(() => formatCourseCode('FE', 0));
});

test('assigns sequential codes per prefix', async () => {
  const db = memoryDb([{ category_id: '1' }, { category_id: '1' }, { category_id: '4' }]);
  const codes = [];
  for (const c of db.rows) codes.push(await assignCourseCode(db, c));
  assert.deepEqual(codes, ['FE001', 'FE002', 'MOB001']);
});

test('never reassigns an existing code', async () => {
  const db = memoryDb([{ category_id: '2', course_code: 'BE007' }]);
  assert.equal(await assignCourseCode(db, db.rows[0]), 'BE007');
  assert.equal(db.rows[0].course_code, 'BE007');
});

test('concurrent assignment produces unique codes', async () => {
  const db = memoryDb(Array.from({ length: 20 }, () => ({ category_id: '9' })));
  const codes = await Promise.all(db.rows.map(c => assignCourseCode(db, c)));
  assert.equal(new Set(codes).size, 20);
});

test('admin list exposes courseCode and searches by it', async () => {
  const db = memoryDb([{ course_id: '1', title: 'A', category_id: '1', course_code: 'FE001' }, { course_id: '2', title: 'B', category_id: '2', course_code: 'BE001' }]);
  const result = await listAdminCourses({ search: 'be001' }, { db });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].courseCode, 'BE001');
  assert.equal(result.items[0].courseId, '2');
});

