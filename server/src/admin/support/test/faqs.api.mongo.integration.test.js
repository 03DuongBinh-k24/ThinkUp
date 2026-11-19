import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { ObjectId } from 'mongodb';
import { closeMongoDb, getMongoDb, signJwt } from '../../../user/db.js';
import { createAdminAuthMiddleware } from '../../auth/auth.admin.js';
import { COLLECTION_FAQS, createAdminFaqsRouter } from '../faqs.admin.js';

test('FAQ Admin API completes create, edit, reorder, visibility, and delete against isolated MongoDB', async t => {
  const dbName = process.env.MONGODB_DB_NAME || '';
  if (!/^Thinkup_admin_api_test_[A-Za-z0-9_-]+$/.test(dbName)) {
    t.skip('Set MONGODB_DB_NAME to a fresh Thinkup_admin_api_test_* database.');
    return;
  }

  const db = await getMongoDb();
  const occupied = [];
  for (const item of await db.listCollections({}, { nameOnly: true }).toArray()) {
    const count = await db.collection(item.name).countDocuments();
    if (count) occupied.push({ collection: item.name, count });
  }
  assert.deepEqual(occupied, [], `Refusing to use a non-empty test database: ${JSON.stringify(occupied)}`);

  const adminId = new ObjectId();
  const app = express();
  app.use(express.json());
  app.use('/api/admin/support/faqs', createAdminFaqsRouter(express, createAdminAuthMiddleware()));
  app.use((error, req, res, next) => {
    void req; void next;
    res.status(error.status || 500).json({ success: false, code: error.code || 'ERROR', message: error.message });
  });
  let server;
  let faqId;
  try {
    await db.collection('admins').insertOne({ _id: adminId, role: 'CS', status: 'ACTIVE', is_active: true });
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/admin/support/faqs`;
    const call = (path, method, body) => fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${signJwt({ adminId: String(adminId) })}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const createdResponse = await call('/', 'POST', {
      categoryCode: 'account_security',
      question: 'How can I secure my learning account?',
      answer: 'Use a unique password and keep your recovery details current.',
      keywords: 'account, security',
    });
    assert.equal(createdResponse.status, 201);
    const createdEnvelope = await createdResponse.json();
    assert.equal(createdEnvelope.success, true);
    const created = createdEnvelope.data.item;
    faqId = created._id;
    assert.match(faqId, /^faq_/);
    assert.equal(created.status, 'published');
    assert.deepEqual(created.keywords, ['account', 'security']);
    assert.equal(await db.collection(COLLECTION_FAQS).countDocuments({ _id: faqId }), 1);

    const updatedResponse = await call(`/${encodeURIComponent(faqId)}`, 'PUT', { question: 'How do I secure my ThinkUp account?' });
    assert.equal(updatedResponse.status, 200);
    assert.equal((await updatedResponse.json()).data.updated.question, 'How do I secure my ThinkUp account?');
    assert.equal((await db.collection(COLLECTION_FAQS).findOne({ _id: faqId })).question, 'How do I secure my ThinkUp account?');

    const hiddenResponse = await call(`/${encodeURIComponent(faqId)}/toggle-status`, 'PATCH');
    assert.equal(hiddenResponse.status, 200);
    assert.equal((await hiddenResponse.json()).data.status, 'hidden');
    const publishedResponse = await call(`/${encodeURIComponent(faqId)}/toggle-status`, 'PATCH');
    assert.equal(publishedResponse.status, 200);
    assert.equal((await publishedResponse.json()).data.status, 'published');

    const reorderResponse = await call(`/${encodeURIComponent(faqId)}/reorder`, 'PATCH', { orderIndex: 3 });
    assert.equal(reorderResponse.status, 200);
    assert.equal((await reorderResponse.json()).data.newOrderIndex, 3);
    assert.equal((await db.collection(COLLECTION_FAQS).findOne({ _id: faqId })).order_index, 3);

    const deletedResponse = await call(`/${encodeURIComponent(faqId)}`, 'DELETE');
    assert.equal(deletedResponse.status, 200);
    const deleted = (await deletedResponse.json()).data;
    assert.equal(deleted.deletedId, faqId);
    assert.equal(deleted.deletedQuestion, 'How do I secure my ThinkUp account?');
    assert.equal(await db.collection(COLLECTION_FAQS).countDocuments({ _id: faqId }), 0);
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise(resolve => server.close(resolve));
    }
    if (faqId) await db.collection(COLLECTION_FAQS).deleteMany({ _id: faqId });
    await db.collection('admins').deleteMany({ _id: adminId });
    const leftovers = [];
    for (const item of await db.listCollections({}, { nameOnly: true }).toArray()) {
      const count = await db.collection(item.name).countDocuments();
      if (count) leftovers.push({ collection: item.name, count });
    }
    await closeMongoDb();
    assert.deepEqual(leftovers, [], `Test fixture cleanup left documents: ${JSON.stringify(leftovers)}`);
  }
});
