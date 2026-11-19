import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getMongoDb, closeMongoDb } from '../src/user/db.js';
import { saveContentPost, deleteContentPost } from '../src/admin/content/content.admin.js';
import { getAdminCourse, decideCourseReview } from '../src/admin/courses/courses.admin.js';
import { COLLECTION_TICKETS } from '../src/user/support/support.user.js';
import { claimTicket, getAdminTicketDetail } from '../src/admin/support/tickets.admin.js';
import { COLLECTION_FAQS, createFaq, updateFaq, deleteFaq, toggleFaqStatus, listFaqs } from '../src/admin/support/faqs.admin.js';

if (!process.argv.includes('--write-fixtures') || !process.env.MONGODB_DB_NAME) {
  throw new Error('Supply database configuration and --write-fixtures to run this check.');
}
const marker = 'QA-' + randomUUID();
const actor = { id: new ObjectId().toHexString(), role: 'SA', fullName: marker };
const request = { adminId: actor.id, headers: {}, ip: '127.0.0.1' };
const db = await getMongoDb();
const options = { db };
const courseId = new ObjectId();
const fixtures = [
  ['blog_posts', { slug: marker.toLowerCase(), owner_admin_id: actor.id }],
  ['courses', { _id: courseId, course_id: marker }],
  [COLLECTION_TICKETS, { _id: marker, ticket_code: marker }],
  [COLLECTION_FAQS, { question: marker, 'created_by.id': actor.id }]
];
console.log('Run:', marker);
try {
  const post = await saveContentPost(null, { title: marker, slug: marker, category: 'Backend', status: 'draft' }, request, options);
  await saveContentPost(post.id, { excerpt: 'QA updated' }, request, options);
  assert.equal((await db.collection('blog_posts').findOne({ _id: new ObjectId(post.id) })).excerpt, 'QA updated');
  await deleteContentPost(post.id, request, options);
  assert.equal(await db.collection('blog_posts').countDocuments(fixtures[0][1]), 0);
  console.log('PASS draft create/edit/delete');

  await db.collection('courses').insertOne({ _id: courseId, course_id: marker, title: marker, status: 'pending_review', created_at: new Date() });
  const { course } = await getAdminCourse(String(courseId), options);
  const decision = { expectedRevision: course.reviewRevision, decision: 'reject', reason: 'QA', details: 'QA test review details' };
  await decideCourseReview(String(courseId), decision, request, options);
  assert.equal((await getAdminCourse(String(courseId), options)).course.reviewStatus, 'rejected');
  await assert.rejects(decideCourseReview(String(courseId), decision, request, options), { status: 409 });
  console.log('PASS course decision/reload/stale decision');

  await db.collection(COLLECTION_TICKETS).insertOne({ _id: marker, ticket_code: marker, status: 'unassigned', topic: 'technical_lab', created_at: new Date() });
  assert.equal((await claimTicket(actor, marker, options)).assigned, true);
  assert.equal((await claimTicket(actor, marker, options)).assigned, false);
  const ticket = await getAdminTicketDetail(actor, marker, options);
  assert.equal(ticket.assignee.id, actor.id);
  assert.equal(ticket.sla.remainingHours, null);
  console.log('PASS ticket claim/reload/repeat/missing SLA');

  const faq = { question: marker, answer: 'QA original', categoryCode: 'other', status: 'hidden' };
  await assert.rejects(createFaq(actor, { ...faq, question: '' }, options), { status: 400 });
  const { item } = await createFaq(actor, faq, options);
  await updateFaq(actor, item._id, { answer: 'QA updated' }, options);
  await toggleFaqStatus(actor, item._id, options);
  const { items } = await listFaqs({ q: marker }, options);
  const saved = items.find(row => row.id === item._id);
  assert.equal(saved.answer, 'QA updated');
  assert.equal(saved.status, 'published');
  await deleteFaq(actor, item._id, options);
  console.log('PASS FAQ validation/create/edit/visibility/read/delete');
} finally {
  try {
    const cleanup = await Promise.allSettled(fixtures.map(async ([name, filter]) => {
      await db.collection(name).deleteMany(filter);
      assert.equal(await db.collection(name).countDocuments(filter), 0, name);
    }));
    const failures = cleanup.filter(result => result.status === 'rejected');
    if (failures.length) throw new AggregateError(failures.map(result => result.reason), 'Fixture cleanup failed: ' + marker);
    console.log('Verified cleanup for all four fixture types. Audit history retained.');
  } finally { await closeMongoDb(); }
}
