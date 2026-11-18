import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteAdminUserEvidence } from '../users.admin.js';

const ADMIN_ID = '507f1f77bcf86cd799439011';

function fixture(files) {
  const rows = new Map(files.map((file) => [file._id, { ...file }]));
  const audits = [];
  const db = {
    collection(name) {
      if (name === 'admin_user_evidence') {
        return {
          async findOne(filter) { return rows.get(filter._id) || null; },
          async deleteOne(filter) {
            const row = rows.get(filter._id);
            if (!row || row.linked_at !== filter.linked_at) return { deletedCount: 0 };
            rows.delete(filter._id);
            return { deletedCount: 1 };
          },
        };
      }
      if (name === 'admin_audit_logs') return { async insertOne(row) { audits.push(row); return { acknowledged: true }; } };
      throw new Error(`Unexpected collection: ${name}`);
    },
  };
  return { db, rows, audits };
}

const evidenceId = (suffix) => `uev_${suffix.toString(16).padStart(32, '0')}`;

test('evidence delete removes an unlinked upload and writes one audit entry', async () => {
  const id = evidenceId(1);
  const { db, rows, audits } = fixture([
    { _id: id, owner_user_id: ADMIN_ID, filename: 'cccd.pdf', size_bytes: 128, linked_at: null },
  ]);
  const result = await deleteAdminUserEvidence(id, { adminId: ADMIN_ID, ip: '127.0.0.1', headers: {} }, { db });

  assert.deepEqual(result, { success: true, deleted: true, evidenceId: id });
  assert.equal(rows.has(id), false);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, 'USER_EVIDENCE_DELETED');
});

test('evidence delete rejects invalid ids, missing rows and already-linked evidence', async () => {
  const linkedId = evidenceId(2);
  const { db, rows } = fixture([
    { _id: linkedId, owner_user_id: ADMIN_ID, filename: 'a.pdf', size_bytes: 1, linked_at: new Date() },
  ]);
  const req = { adminId: ADMIN_ID, ip: '127.0.0.1', headers: {} };

  await assert.rejects(() => deleteAdminUserEvidence('not-a-file-id', req, { db }),
    (err) => err.status === 400 && err.code === 'EVIDENCE_INVALID');
  await assert.rejects(() => deleteAdminUserEvidence(evidenceId(3), req, { db }),
    (err) => err.status === 404 && err.code === 'EVIDENCE_NOT_FOUND');
  await assert.rejects(() => deleteAdminUserEvidence(linkedId, req, { db }),
    (err) => err.status === 409 && err.code === 'EVIDENCE_DELETE_DEPENDENCY');
  assert.equal(rows.has(linkedId), true);
});

test('evidence delete is idempotent-safe: repeated cleanup returns 404 and deletes nothing else', async () => {
  const id = evidenceId(4);
  const { db, rows, audits } = fixture([
    { _id: id, owner_user_id: ADMIN_ID, filename: 'b.pdf', size_bytes: 2, linked_at: null },
  ]);
  const req = { adminId: ADMIN_ID, ip: '127.0.0.1', headers: {} };

  await deleteAdminUserEvidence(id, req, { db });
  await assert.rejects(() => deleteAdminUserEvidence(id, req, { db }),
    (err) => err.status === 404 && err.code === 'EVIDENCE_NOT_FOUND');

  assert.equal(rows.size, 0);
  assert.equal(audits.length, 1);
});
