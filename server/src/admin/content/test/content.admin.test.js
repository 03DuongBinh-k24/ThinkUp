import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteContentPost, listContentComments, moderateContentComment } from '../content.admin.js';

function makeCommentDb(comment) {
  const writes = [];
  const db = {
    collection(name) {
      if (name === 'admin_audit_logs') return { async insertOne(row) { writes.push({ name, row }); return { acknowledged: true }; } };
      return {
        async findOne() { return comment; },
        async updateOne(filter, update) { writes.push({ name, filter, update }); return { modifiedCount: 1 }; },
        find() { return { sort() { return this; }, limit() { return this; }, async toArray() { return []; } }; },
      };
    },
  };
  return { db, writes };
}

test('comment reply is stored as an Admin reply and audited without changing visibility', async () => {
  const comment = { _id: 'comment-1', status: 'visible', content: 'Nội dung bình luận đủ dài.' };
  const { db, writes } = makeCommentDb(comment);
  const result = await moderateContentComment('comment-1', 'blog', 'reply', { content: 'Phản hồi từ bộ phận quản trị.' }, {
    adminId: '507f1f77bcf86cd799439011', ip: '127.0.0.1', get: () => 'test-agent',
  }, { db, now: new Date('2026-01-01T00:00:00Z') });

  assert.equal(result.status, 'visible');
  assert.equal(writes[0].update.$set.admin_reply.role, 'admin');
  assert.equal(writes[0].update.$set.status, undefined);
  assert.equal(writes.some(write => write.name === 'admin_audit_logs'), true);
});

test('comment list combines both configured sources and excludes hard-deleted rows', async () => {
  const sources = [];
  const db = { collection(name) { sources.push(name); return { find() { return { sort() { return this; }, limit() { return this; }, async toArray() { return []; } }; } }; } };
  const result = await listContentComments({ page: 1, pageSize: 10 }, { db });

  assert.deepEqual(sources, ['blog_comments', 'course_comments']);
  assert.equal(result.pagination.total, 0);
});

test('draft post delete removes only owned unreferenced content and audits it', async () => {
  const writes = [];
  const post = { _id: 'post-e2e', owner_admin_id: '507f1f77bcf86cd799439011', status: 'draft' };
  const db = { collection(name) {
    if (name === 'blog_posts') return { async findOne() { return post; }, async deleteOne() { writes.push('deleted'); return { deletedCount: 1 }; } };
    if (name === 'blog_comments' || name === 'content_reports') return { async countDocuments() { return 0; } };
    return { async insertOne(row) { writes.push(row); return { acknowledged: true }; } };
  } };
  const result = await deleteContentPost('post-e2e', { adminId: post.owner_admin_id, ip: '127.0.0.1', headers: {} }, { db });
  assert.equal(result.deleted, true);
  assert.equal(writes.includes('deleted'), true);
  assert.equal(writes.some(item => item?.action === 'CONTENT_POST_DELETED'), true);
});

test('content post delete rejects published state and dependencies', async () => {
  const owner = '507f1f77bcf86cd799439011';
  const makeDb = (post, references = 0) => ({ collection(name) {
    if (name === 'blog_posts') return { async findOne() { return post; } };
    if (name === 'blog_comments' || name === 'content_reports') return { async countDocuments() { return references; } };
    return { async insertOne() { return { acknowledged: true }; } };
  } });
  await assert.rejects(() => deleteContentPost('post-published', { adminId: owner }, { db: makeDb({ _id: 'post-published', owner_admin_id: owner, status: 'published' }) }), { code: 'CONTENT_POST_DELETE_STATE_CONFLICT' });
  await assert.rejects(() => deleteContentPost('post-linked', { adminId: owner }, { db: makeDb({ _id: 'post-linked', owner_admin_id: owner, status: 'draft' }, 1) }), { code: 'CONTENT_POST_DELETE_DEPENDENCY' });
});
