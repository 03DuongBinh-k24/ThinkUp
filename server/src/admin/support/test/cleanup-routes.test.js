import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAdminTicketsRouter } from '../tickets.admin.js';
import { createAdminComplaintsRouter } from '../complaints.admin.js';
import { createAdminUsersRouter } from '../../users/users.admin.js';

const ADMIN_ID = '507f1f77bcf86cd799439011';

// Mirrors the real admin auth contract: no token => 401 handled by auth middleware,
// valid token => req.adminRole is set and the RBAC middleware decides 403.
function authStub(req, res, next) {
  const role = req.get('x-test-role');
  if (!role) return res.status(401).json({ success: false, code: 'ADMIN_UNAUTHORIZED', message: 'Thiếu token quản trị.' });
  req.adminId = ADMIN_ID;
  req.adminRole = role;
  req.adminUser = { id: ADMIN_ID, role };
  return next();
}

async function withApp(mount, router, run) {
  const app = express();
  app.use(express.json());
  app.use(mount, router);
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ success: false, code: err.code || 'ERROR' }));
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

const call = (url, role) => fetch(url, {
  method: 'DELETE',
  headers: { connection: 'close', ...(role ? { 'x-test-role': role } : {}) },
});

test('support ticket/complaint delete require authentication before any DB access', async () => {
  await withApp('/api/admin/support/tickets', createAdminTicketsRouter(express, authStub), async (base) => {
    const response = await call(`${base}/api/admin/support/tickets/TK-CLEAN-1`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'ADMIN_UNAUTHORIZED');
  });
  await withApp('/api/admin/support/complaints', createAdminComplaintsRouter(express, authStub), async (base) => {
    const response = await call(`${base}/api/admin/support/complaints/CP-CLEAN-1`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'ADMIN_UNAUTHORIZED');
  });
});

test('support delete rejects unknown admin roles with 403', async () => {
  await withApp('/api/admin/support/tickets', createAdminTicketsRouter(express, authStub), async (base) => {
    const response = await call(`${base}/api/admin/support/tickets/TK-CLEAN-1`, 'UNKNOWN_ROLE');
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'ADMIN_FORBIDDEN');
  });
  await withApp('/api/admin/support/complaints', createAdminComplaintsRouter(express, authStub), async (base) => {
    const response = await call(`${base}/api/admin/support/complaints/CP-CLEAN-1`, 'UNKNOWN_ROLE');
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, 'ADMIN_FORBIDDEN');
  });
});

test('user evidence delete is restricted to SA/CA and validates the id before touching storage', async () => {
  await withApp('/api/admin/users', createAdminUsersRouter(express, authStub), async (base) => {
    for (const role of ['FA', 'CS']) {
      const forbidden = await call(`${base}/api/admin/users/evidence/uev_${'0'.repeat(32)}`, role);
      assert.equal(forbidden.status, 403, `role ${role} must not delete evidence`);
      assert.equal((await forbidden.json()).code, 'ADMIN_FORBIDDEN');
    }
    const unauthenticated = await call(`${base}/api/admin/users/evidence/uev_${'0'.repeat(32)}`);
    assert.equal(unauthenticated.status, 401);

    const invalid = await call(`${base}/api/admin/users/evidence/not-an-evidence-id`, 'SA');
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).code, 'EVIDENCE_INVALID');
  });
});
