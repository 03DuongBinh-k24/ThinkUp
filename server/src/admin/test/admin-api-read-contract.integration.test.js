import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { ObjectId } from 'mongodb';
import { getMongoDb, closeMongoDb, signJwt } from '../../user/db.js';
import { createAdminAuthMiddleware } from '../auth/auth.admin.js';
import { normalizeAdminRole } from '../auth/admin-rbac.js';
import { createAdminDashboardRouter } from '../dashboard/dashboard.admin.js';
import { createAdminUsersRouter } from '../users/users.admin.js';
import { createAdminCoursesRouter } from '../courses/courses.admin.js';
import { createAdminRoadmapsRouter } from '../roadmaps/roadmaps.admin.js';
import { createAdminOrdersRouter } from '../business/orders.admin.js';
import { createAdminVouchersRouter } from '../business/vouchers.admin.js';
import { createAdminPayoutsRouter } from '../business/payouts.admin.js';
import { createAdminTicketsRouter } from '../support/tickets.admin.js';
import { createAdminComplaintsRouter } from '../support/complaints.admin.js';
import { createAdminFaqsRouter } from '../support/faqs.admin.js';
import { createAdminSystemRouter } from '../system/system.routes.js';
import { createAdminContentRouter } from '../content/content.admin.js';
import { createAdminPreferencesRouter } from '../preferences/preferences.admin.js';
import { createAdminNotificationsRouter } from '../notifications/notifications.admin.js';

const routerSpecs = [
  { area: 'users', make: createAdminUsersRouter, prefixes: ['/api/admin/users'] },
  { area: 'courses', make: createAdminCoursesRouter, prefixes: ['/api/admin/courses'] },
  { area: 'roadmaps', make: createAdminRoadmapsRouter, prefixes: ['/api/admin/roadmaps'] },
  { area: 'content', make: createAdminContentRouter, prefixes: ['/api/admin/content', '/api/v1/admin/content'] },
  { area: 'orders', make: createAdminOrdersRouter, prefixes: ['/api/admin/business/orders', '/api/v1/admin/business/orders'] },
  { area: 'vouchers', make: createAdminVouchersRouter, prefixes: ['/api/admin/business/vouchers', '/api/v1/admin/business/vouchers'] },
  { area: 'payouts', make: createAdminPayoutsRouter, prefixes: ['/api/admin/business/payouts', '/api/v1/admin/business/payouts'] },
  { area: 'tickets', make: createAdminTicketsRouter, prefixes: ['/api/admin/support/tickets', '/api/v1/admin/support/tickets'] },
  { area: 'complaints', make: createAdminComplaintsRouter, prefixes: ['/api/admin/support/complaints', '/api/v1/admin/support/complaints'] },
  { area: 'faqs', make: createAdminFaqsRouter, prefixes: ['/api/admin/support/faqs', '/api/v1/admin/support/faqs'] },
  { area: 'system', make: createAdminSystemRouter, prefixes: ['/api/admin/system', '/api/v1/admin/system'] },
  { area: 'preferences', make: createAdminPreferencesRouter, prefixes: ['/api/admin/preferences', '/api/v1/admin/preferences'] },
  { area: 'notifications', make: createAdminNotificationsRouter, prefixes: ['/api/admin/notifications', '/api/v1/admin/notifications'] },
  { area: 'dashboard', make: createAdminDashboardRouter, prefixes: ['/api/admin/dashboard', '/api/v1/admin/dashboard'], dashboard: true },
];

const ALL_ROLES = ['SA', 'CA', 'FA', 'CS'];
function allowedRoles(area, method, path) {
  if (area === 'system') return ['SA'];
  if (area === 'dashboard') {
    if (path === '/overview') return ALL_ROLES;
    if (path === '/analytics') return ['SA', 'CA', 'FA'];
    return ['SA'];
  }
  if (area === 'users') {
    if (method === 'GET' && (path === '/evidence/:id' || path === '/lecturers/:id/documents/:documentId/download')) return ['SA', 'CA'];
    if (path === '/:id' && method === 'PUT' || path === '/:id' && method === 'DELETE') return ['SA'];
    if (path === '/students/lock' || path === '/students/:id/unlock' || path === '/lecturers/:id/unlock' || path === '/evidence/:userId') return ['SA', 'CS'];
    if (path === '/lecturers/:id/decision' || path === '/lecturers/:id/activate' || path === '/lecturers/:id/discipline' || path === '/:id/claim' || path === '/:id/heartbeat' || path === '/:id/claim') return ['SA', 'CA'];
    return ALL_ROLES;
  }
  if (area === 'content') {
    if (/^\/(comments|reports)(\/|$)/.test(path)) return ['SA', 'CS'];
    return ['SA', 'CA'];
  }
  if (area === 'courses') return path === '/:id/finance' ? ['SA', 'FA'] : path === '/:id/business-status' || path === '/:id/pricing' ? ['SA'] : ['SA', 'CA'];
  if (area === 'roadmaps') return path === '/:id/hide' ? ['SA'] : ['SA', 'CA'];
  if (['orders', 'vouchers', 'payouts'].includes(area)) return ['SA', 'FA'];
  if (area === 'faqs') return ['SA', 'CS', 'CA'];
  return ALL_ROLES;
}

function registeredRoutes(router) {
  const routes = [];
  for (const layer of router.stack) {
    if (!layer.route) continue;
    const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
    for (const path of paths) {
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        if (layer.route.methods[method]) routes.push({ method: method.toUpperCase(), path });
      }
    }
  }
  return routes;
}

test('mounted Admin APIs enforce role access and return a non-5xx request/response contract', async t => {
  const dbName = process.env.MONGODB_DB_NAME || '';
  if (!/^Thinkup_admin_api_test_[A-Za-z0-9_-]+$/.test(dbName)) {
    t.skip('Set MONGODB_DB_NAME to a fresh Thinkup_admin_api_test_* database.');
    return;
  }

  const db = await getMongoDb();
  const preexisting = [];
  for (const item of await db.listCollections({}, { nameOnly: true }).toArray()) {
    const count = await db.collection(item.name).countDocuments();
    if (count) preexisting.push({ collection: item.name, count });
  }
  assert.deepEqual(preexisting, [], `Refusing to use a non-empty test database: ${JSON.stringify(preexisting)}`);

  const admins = new Map(ALL_ROLES.map(role => [role, new ObjectId()]));
  const app = express();
  app.use(express.json());
  const auth = createAdminAuthMiddleware();
  const routeCases = [];
  for (const spec of routerSpecs) {
    const router = spec.dashboard ? spec.make(express, auth, normalizeAdminRole) : spec.make(express, auth);
    const routes = registeredRoutes(router);
    assert.ok(routes.length, `No GET routes registered for ${spec.area}`);
    for (const prefix of spec.prefixes) {
      app.use(prefix, router);
      for (const route of routes) routeCases.push({ area: spec.area, ...route, prefix, allowed: allowedRoles(spec.area, route.method, route.path) });
    }
  }
  app.use((error, req, res, next) => {
    void next;
    res.status(error.status || (error.name === 'ValidationError' ? 400 : 500)).json({ message: error.message || 'Internal error', ...(error.code ? { code: error.code } : {}) });
  });

  let server;
  try {
    await db.collection('admins').insertMany([...admins].map(([role, _id]) => ({ _id, role, status: 'ACTIVE', is_active: true, email: `${role.toLowerCase()}@example.invalid` })));
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.ok(routeCases.length >= 50, `Expected broad GET API coverage; found ${routeCases.length} route mounts.`);

    for (const route of routeCases) {
      assert.equal(typeof route.path, 'string', `${route.area} route must have a stable path`);
      const path = route.path.replace(/:([A-Za-z0-9_]+)/g, 'contract-fixture-id');
      for (const role of ALL_ROLES) {
        const token = signJwt({ adminId: String(admins.get(role)) });
        const response = await fetch(`${base}${route.prefix}${path}`, {
          method: route.method,
          headers: { Authorization: `Bearer ${token}`, ...(route.method === 'GET' ? {} : { 'Content-Type': 'application/json' }) },
          ...(route.method === 'GET' ? {} : { body: '{}' }),
        });
        const expectedAllowed = route.allowed.includes(role);
        if (!expectedAllowed) {
          assert.equal(response.status, 403, `${role} must be denied for ${route.method} ${route.prefix}${route.path}`);
          const payload = await response.json();
          assert.equal(payload.code, 'ADMIN_FORBIDDEN', `${route.method} ${route.prefix}${route.path} must use the Admin forbidden error contract`);
          continue;
        }
        assert.notEqual(response.status, 401, `${role} token should authenticate for ${route.method} ${route.prefix}${route.path}`);
        assert.notEqual(response.status, 403, `${role} should be permitted for ${route.method} ${route.prefix}${route.path}`);
        assert.ok(response.status < 500, `${route.method} ${route.prefix}${route.path} returned ${response.status}`);
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await response.json();
          assert.ok(payload && typeof payload === 'object', `${route.method} ${route.prefix}${route.path} must return a JSON object or array`);
          if (response.status >= 400) assert.ok(payload.message || payload.code, `${route.method} ${route.prefix}${route.path} error response must include message or code`);
        }
      }
    }
  } finally {
    if (server) {
      server.closeAllConnections?.();
      await new Promise(resolve => server.close(resolve));
    }
    for (const item of await db.listCollections({}, { nameOnly: true }).toArray()) await db.collection(item.name).deleteMany({});
    const remaining = [];
    for (const item of await db.listCollections({}, { nameOnly: true }).toArray()) {
      const count = await db.collection(item.name).countDocuments();
      if (count) remaining.push({ collection: item.name, count });
    }
    await closeMongoDb();
    assert.deepEqual(remaining, [], `Test fixture cleanup left documents: ${JSON.stringify(remaining)}`);
  }
});
