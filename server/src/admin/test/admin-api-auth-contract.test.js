import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
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

const API_AUTH_REQUIRED = [
  { router: createAdminUsersRouter, prefixes: ['/api/admin/users'] },
  { router: createAdminCoursesRouter, prefixes: ['/api/admin/courses'] },
  { router: createAdminRoadmapsRouter, prefixes: ['/api/admin/roadmaps'] },
  { router: createAdminContentRouter, prefixes: ['/api/admin/content', '/api/v1/admin/content'] },
  { router: createAdminOrdersRouter, prefixes: ['/api/admin/business/orders', '/api/v1/admin/business/orders'] },
  { router: createAdminVouchersRouter, prefixes: ['/api/admin/business/vouchers', '/api/v1/admin/business/vouchers'] },
  { router: createAdminPayoutsRouter, prefixes: ['/api/admin/business/payouts', '/api/v1/admin/business/payouts'] },
  { router: createAdminTicketsRouter, prefixes: ['/api/admin/support/tickets', '/api/v1/admin/support/tickets'] },
  { router: createAdminComplaintsRouter, prefixes: ['/api/admin/support/complaints', '/api/v1/admin/support/complaints'] },
  { router: createAdminFaqsRouter, prefixes: ['/api/admin/support/faqs', '/api/v1/admin/support/faqs'] },
  { router: createAdminSystemRouter, prefixes: ['/api/admin/system', '/api/v1/admin/system'] },
  { router: createAdminPreferencesRouter, prefixes: ['/api/admin/preferences', '/api/v1/admin/preferences'] },
  { router: createAdminNotificationsRouter, prefixes: ['/api/admin/notifications', '/api/v1/admin/notifications'] },
  { router: createAdminDashboardRouter, prefixes: ['/api/admin/dashboard', '/api/v1/admin/dashboard'], dashboard: true },
];

function pathsFor(router) {
  const routes = [];
  for (const layer of router.stack) {
    if (!layer.route) continue;
    const pathValues = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
    for (const path of pathValues) {
      assert.equal(typeof path, 'string', 'Every Admin route must have an inspectable string path.');
      for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
        if (layer.route.methods[method]) routes.push({ method: method.toUpperCase(), path });
      }
    }
  }
  return routes;
}

test('all mounted protected Admin API endpoints reject requests without authentication', async t => {
  const app = express();
  app.use(express.json());
  const requireAdmin = createAdminAuthMiddleware();
  const endpointCases = [];

  for (const item of API_AUTH_REQUIRED) {
    const router = item.dashboard
      ? item.router(express, requireAdmin, normalizeAdminRole)
      : item.router(express, requireAdmin);
    const routes = pathsFor(router);
    assert.ok(routes.length > 0, `Expected registered routes for ${item.prefixes[0]}`);
    for (const prefix of item.prefixes) {
      app.use(prefix, router);
      for (const route of routes) endpointCases.push({ ...route, url: `${prefix}${route.path === '/' ? '' : route.path}` });
    }
  }

  app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    assert.ok(endpointCases.length >= 100, `Expected broad Admin API coverage; found ${endpointCases.length} endpoint mounts.`);
    for (const endpoint of endpointCases) {
      const path = endpoint.url.replace(/:([A-Za-z0-9_]+)/g, 'contract-fixture-id');
      const response = await fetch(`${base}${path}`, {
        method: endpoint.method,
        headers: endpoint.method === 'GET' ? {} : { 'Content-Type': 'application/json' },
        ...(endpoint.method === 'GET' ? {} : { body: '{}' }),
      });
      assert.equal(response.status, 401, `${endpoint.method} ${endpoint.url} must require an Admin session`);
      const payload = await response.json();
      assert.ok(payload.code || payload.message, `${endpoint.method} ${endpoint.url} must return the established JSON error envelope`);
    }
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
