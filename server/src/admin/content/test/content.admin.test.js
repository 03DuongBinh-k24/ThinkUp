import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteContentPost, listContentComments, moderateContentComment, postAuthorEmail } from '../content.admin.js';

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
  const db = { collection(name) { sources.push(name); return { async countDocuments() { return 0; }, find() { return { sort() { return this; }, skip() { return this; }, limit() { return this; }, async toArray() { return []; } }; } }; } };
  const result = await listContentComments({ page: 1, pageSize: 10 }, { db });

  assert.deepEqual(sources, ['blog_comments', 'course_comments', 'blog_comments', 'course_comments']);
  assert.equal(result.pagination.total, 0);
});

test('comment list resolves missing context title from referenced post/course', async () => {
  const postId='507f1f77bcf86cd799439011';
  const db={collection(name){
    if(name==='blog_comments')return{async countDocuments(){return 1;},find(){return{sort(){return this;},skip(){return this;},limit(){return this;},async toArray(){return[{_id:'c1',post_id:postId,content:'<p>Hello</p>',author_name:'Learner',created_at:new Date()}];}};}};
    if(name==='course_comments')return{async countDocuments(){return 0;},find(){return{sort(){return this;},skip(){return this;},limit(){return this;},async toArray(){return[];}};}};
    if(name==='blog_posts')return{async findOne(){return{title:'Resolved blog title'};}};
    throw new Error(`Unexpected collection ${name}`);
  }};
  const result=await listContentComments({page:1,pageSize:10},{db});
  assert.equal(result.items[0].contextTitle,'Resolved blog title');
});

test('pending/flagged filter includes reported comments and default list does not drop them', async () => {
  const rows = [
    { _id:'pending-1', status:'pending', createdAt:new Date() },
    { _id:'flagged-1', status:'reported', createdAt:new Date() },
    { _id:'visible-1', status:'visible', createdAt:new Date() },
  ];
  const db={collection(name){return{
    async countDocuments(filter){const statuses=filter.$and?.find(x=>x.status)?.status?.$in;return rows.filter(row=>!statuses||statuses.includes(row.status)).length;},
    find(filter){const statuses=filter.$and?.find(x=>x.status)?.status?.$in;const selected=rows.filter(row=>!statuses||statuses.includes(row.status));return{sort(){return this;},skip(){return this;},limit(){return this;},async toArray(){return selected;}};}
  };}};
  const filtered=await listContentComments({page:1,pageSize:10,status:'pending'},{db});
  assert.deepEqual(new Set(filtered.items.map(x=>x.status)),new Set(['pending','flagged']));
  const all=await listContentComments({page:1,pageSize:10},{db});
  assert.equal(all.items.some(x=>x.id==='flagged-1'),true);
});

test('post removal sends an email before archiving and audits the action', async () => {
  const writes = [];
  const post = { _id: 'post-e2e', owner_admin_id: '507f1f77bcf86cd799439011', owner_email:'author@example.test', status: 'published' };
  const db = { collection(name) {
    if (name === 'blog_posts') return { async findOne() { return post; }, async updateOne(filter, update) { writes.push({filter, update}); return { modifiedCount: 1 }; } };
    return { async insertOne(row) { writes.push(row); return { acknowledged: true }; } };
  } };
  const result = await deleteContentPost('post-e2e', { adminId: post.owner_admin_id, ip: '127.0.0.1', headers: {}, body:{reason:'Nội dung sai lệch',note:'Bài có thông tin cần cập nhật lại trước khi công khai.'} }, { db, skipEmail:true });
  assert.equal(result.deleted, true);
  assert.equal(result.emailSentTo,'test@example.invalid');
  assert.equal(writes.some(item=>item?.update?.$set?.status==='archived'),true);
  assert.equal(writes.some(item => item?.action === 'CONTENT_POST_DELETED'), true);
});

test('content post delete rejects published state and dependencies', async () => {
  const owner = '507f1f77bcf86cd799439011';
  const makeDb = (post, references = 0) => ({ collection(name) {
    if (name === 'blog_posts') return { async findOne() { return post; } };
    if (name === 'users' || name === 'admins') return { async findOne() { return null; } };
    if (name === 'blog_comments' || name === 'content_reports') return { async countDocuments() { return references; } };
    return { async insertOne() { return { acknowledged: true }; } };
  } });
  await assert.rejects(() => deleteContentPost('post-archived', { adminId: owner }, { db: makeDb({ _id: 'post-archived', owner_admin_id: owner, status: 'archived' }) }), { code: 'CONTENT_POST_DELETE_STATE_CONFLICT' });
  await assert.rejects(() => deleteContentPost('post-published', { adminId: owner, body:{reason:'Sai',note:'Giải trình đủ dài cho việc xử lý này'} }, { db: makeDb({ _id: 'post-published', owner_admin_id: owner, status: 'published' }) }), { code: 'CONTENT_POST_AUTHOR_EMAIL_MISSING' });
});

test('post author email resolves by linked user id and by email stored on the post', async () => {
  const owner = '507f1f77bcf86cd799439011';
  const lookupDb = { collection(name) { return { async findOne(filter) {
    if (name === 'users' && filter.$or?.some(item => item._id?.toString() === owner)) return { email: 'author@example.test' };
    return null;
  } }; } };
  assert.equal(await postAuthorEmail(lookupDb, { owner_user_id: owner }), 'author@example.test');
  assert.equal(await postAuthorEmail({}, { owner_email: 'stored@example.test' }), 'stored@example.test');
});
