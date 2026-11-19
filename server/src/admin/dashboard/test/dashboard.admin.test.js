import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { ObjectId } from 'mongodb';
import {
  createAdminDashboardRouter, getAdminAuditLog, listAdminAuditLogs,
  getAdminDashboardOverview, getAdminDashboardAnalytics, exportAdminAuditLogs,
} from '../dashboard.admin.js';
import { normalizeAdminRole } from '../../auth/admin-rbac.js';

class Collection {
  constructor(rows = []) { this.rows = rows; }
  countDocuments(filter = {}) { return Promise.resolve(this.rows.filter(row => matches(row, filter)).length); }
  find(filter = {}) { let rows = this.rows.filter(row => matches(row, filter)); const cursor = { sort(spec) { rows.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); return cursor; }, limit(n) { rows = rows.slice(0, n); return cursor; }, project() { return cursor; }, toArray: async () => rows }; return cursor; }
  findOne(filter = {}) { return Promise.resolve(this.rows.find(row => matches(row, filter)) || null); }
  aggregate(pipeline) { let rows = this.rows; for (const step of pipeline) { if (step.$match) rows = rows.filter(row => matches(row, step.$match)); if (step.$group) rows = [{ total: rows.reduce((sum,row) => sum + (row.actual_paid_amount ?? row.amount ?? 0),0) }]; } return { toArray: async () => rows }; }
}
function matches(doc, filter) { return Object.entries(filter).every(([key, expected]) => {
  if (key === '$or') return expected.some(branch => matches(doc, branch));
  if (key === '$and') return expected.every(branch => matches(doc, branch));
  const value = doc[key]; if (expected && typeof expected === 'object' && !Array.isArray(expected)) return Object.entries(expected).every(([op, bound]) => op === '$in' ? bound.some(item => String(item) === String(value)) : op === '$lte' ? value != null && new Date(value) <= bound : op === '$gte' ? value != null && new Date(value) >= bound : op === '$ne' ? value !== bound : op === '$exists' ? (value !== undefined) === bound : false);
  if (key === '_id' && value?.toString && expected?.toString) return value.toString() === expected.toString();
  return value === expected;
}); }
function dbOf(tables) { return { collection(name) { return tables[name] || (tables[name] = new Collection()); } }; }

test('overview aggregates verified accounts, courses, paid revenue, room capacity and action counts', async () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const db = dbOf({
    users: new Collection([
      { email_verified: true, status: 'active', created_at: new Date('2026-11-02') },
      { email_verified: true, status: 'active', created_at: new Date('2026-10-05') },
      { email_verified: true, status: 'locked', created_at: new Date('2026-10-06') },
      { email_verified: false, status: 'active', created_at: now },
      { email_verified: true, created_at: now },
    ]),
    courses: new Collection([{ status: 'published', created_at: now }, { status: 'pending_review', created_at: now }]),
    payment_transactions: new Collection([
      { status: 'success', amount: 200, paid_at: now, created_at: now },
      { status: 'failed', amount: 900, paid_at: now, created_at: now },
      { status: 'pending', amount: 75, created_at: now },
    ]),
    study_rooms: new Collection([{ status: 'active', capacity: 10, currentUsers: 4 }]),
    payout_requests: new Collection([
      { status: 'pending', amount: 25_000_000 },
      { status: 'pending', amount: 5_000_000 },
      { status: 'paid', amount: 9_000_000 },
    ]),
    support_tickets: new Collection([
      { status: 'open', due_at: new Date('2026-11-01T00:00:00Z') },
      { status: 'closed', due_at: new Date('2026-11-01T00:00:00Z') },
    ]),
    support_complaints: new Collection([
      { status: 'pending', due_at: new Date('2026-11-01T00:00:00Z') },
      { status: 'resolved', due_at: new Date('2026-11-01T00:00:00Z') },
    ]),
  });
  const result = await getAdminDashboardOverview({ period: 'month' }, { db, now });
  assert.equal(result.kpis.users.total, 4);
  assert.equal(result.kpis.users.active, 2);
  assert.equal(result.kpis.users.newInPeriod, 2);
  assert.equal(result.kpis.courses.statuses.published, 1);
  assert.equal(result.kpis.revenue.total, 200);
  assert.equal(result.kpis.revenue.pending, 75);
  assert.equal(result.kpis.rooms.loadPercent, 40);
  assert.equal(result.actions.payoutsPending, 2);
  assert.equal(result.actions.payoutsLargePending, 1);
  assert.equal(result.actions.complaints, 1);
  assert.equal(result.actions.alerts, 1);
});

test('overview limits action counts for non-super-admin roles', async () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const db = dbOf({
    users: new Collection(), courses: new Collection(), payment_transactions: new Collection(), study_rooms: new Collection(),
    payout_requests: new Collection([{ status: 'pending', amount: 25_000_000 }]),
    support_tickets: new Collection(), support_complaints: new Collection([{ status: 'pending' }]),
  });
  const finance = await getAdminDashboardOverview({ period: 'month' }, { db, now, role: 'FA' });
  assert.deepEqual(Object.keys(finance.kpis), ['revenue']);
  assert.equal(finance.actions.payoutsLargePending, 1);
  assert.equal(finance.actions.complaints, undefined);
  const support = await getAdminDashboardOverview({ period: 'month' }, { db, now, role: 'CS' });
  assert.equal(support.actions.complaints, 1);
  assert.equal(support.actions.payoutsPending, undefined);
});

test('Action Center uses live SLA fields and normalizes legacy string dates', async () => {
  const now = new Date('2026-11-21T12:00:00Z');
  const db = dbOf({
    users: new Collection(),
    courses: new Collection([{ review_status: 'in_review', review_submitted_at: '2026-11-01 10:00:00' }]),
    payment_transactions: new Collection(), study_rooms: new Collection(), payout_requests: new Collection(),
    support_tickets: new Collection([
      { status: 'open', response_due_at: '2026-11-20 10:00:00' },
      { status: 'closed', response_due_at: '2026-11-20 10:00:00' },
    ]),
    support_complaints: new Collection([
      { status: 'reviewing', due_at: '2026-11-20 10:00:00' },
      { status: 'resolved', due_at: '2026-11-20 10:00:00' },
    ]),
  });

  const result = await getAdminDashboardOverview({ period: 'year' }, { db, now });
  assert.equal(result.actions.courseApprovals, 1);
  assert.equal(result.actions.alerts, 2);
  assert.equal(result.actions.complaints, 1);
});

test('dashboard analytics counts enrollments and progress without a special test-data marker', async () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const db = dbOf({
    payment_transactions: new Collection(),
    user_enrollments: new Collection([
      { user_id: 'real-student', course_id: 'course-1', status: 'active' },
      { user_id: 'second-student', course_id: 'course-2', status: 'active' },
    ]),
    user_course_progress: new Collection([
      { user_id: 'real-student', course_id: 'course-1', progress_percentage: 25 },
      { user_id: 'second-student', course_id: 'course-2', progress_percentage: 100 },
    ]),
    courses: new Collection(),
    course_reviews: new Collection(),
    payout_requests: new Collection([
      { status: 'paid', net_amount: 50, paid_at: now },
      { status: 'pending', net_amount: 999, paid_at: now },
    ]),
  });
  const result = await getAdminDashboardAnalytics({ period: 'month' }, { db, now });
  assert.equal(result.learning.totalEnrollments, 2);
  assert.equal(result.learning.inProgress, 1);
  assert.equal(result.learning.completed, 1);
  assert.equal(result.revenue.payout, 50);
  assert.equal(result.revenue.payoutAvailable, true);
  assert.equal(result.revenue.rows[0].payout, 50);
});

test('dashboard revenue includes legacy string dates and classifies from the order snapshot', async () => {
  const now = new Date('2026-11-09T12:00:00Z');
  const db = dbOf({
    payment_transactions: new Collection([{
      status: 'paid', amount: 125_000, paid_at: '2026-11-09 10:00:00',
      order_summary: JSON.stringify({ courses: [{ id: 'removed-course', instructor_id: 'instructor-1', price: 125_000 }] }),
    }]),
    user_enrollments: new Collection(), user_course_progress: new Collection(),
    courses: new Collection(), course_reviews: new Collection(), payout_requests: new Collection(),
  });

  const result = await getAdminDashboardAnalytics({ period: 'month' }, { db, now });
  assert.equal(result.revenue.total, 125_000);
  assert.equal(result.revenue.marketplace, 125_000);
  assert.equal(result.revenue.original, 0);
});

test('audit reads return full IP and user agent, role filter and log ID', async () => {
  const id = new ObjectId(), actor = new ObjectId();
  const db = dbOf({ admins: new Collection([{ _id: actor, role: 'SA', full_name: 'Test SA' }]), admin_audit_logs: new Collection([{ _id: id, admin_id: actor, action: 'COURSE_UPDATE', ip: '203.0.113.5', user_agent: 'Test Device', created_at: new Date(), details: { before: { status: 'draft' }, after: { status: 'published' } } }]) });
  const result = await listAdminAuditLogs({ role: 'SA' }, { db, normalizeRole: normalizeAdminRole, dashboard: true });
  assert.equal(result.items[0].id, String(id)); assert.equal(result.items[0].ip, '203.0.113.5'); assert.equal(result.items[0].userAgent, 'Test Device');
  assert.deepEqual(result.items[0].before, { status: 'draft' });
  assert.equal((await getAdminAuditLog(String(id), { db, normalizeRole: normalizeAdminRole, asStringId: true })).log.id, String(id));
});

test('dashboard routes install authentication and SA authorization before handlers', () => {
  const routes = [];
  const router = { get(path, ...handlers) { routes.push({ path, handlers }); } };
  const fakeExpress = { Router: () => router };
  const auth = (req, res, next) => { req.adminId = new ObjectId().toString(); req.adminRole = req.role; next(); };
  createAdminDashboardRouter(fakeExpress, auth, normalizeAdminRole);
  assert.deepEqual(routes.map(route => route.path), ['/overview', '/analytics', '/audit-logs', '/audit-logs/export', '/audit-logs/:id']);
  for (const route of routes) assert.equal(route.handlers.length, 2);
  let status = null;
  routes[2].handlers[0]({ role: 'FA' }, { status(value) { status = value; return this; }, json() {} }, () => {});
  assert.equal(status, 403);
  let nextCalled = false;
  routes[2].handlers[0]({ role: 'SA' }, { status() { return this; }, json() {} }, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('audit export records a metadata event and returns all matching rows', async () => {
  const id = new ObjectId(), actor = new ObjectId();
  const logs = new Collection([{ _id: id, admin_id: actor, action: 'COURSE_UPDATE', created_at: new Date() }]);
  logs.insertOne = async doc => { doc._id = new ObjectId(); logs.rows.push(doc); };
  const db = dbOf({ admins: new Collection([{ _id: actor, role: 'SA' }]), admin_audit_logs: logs });
  const result = await exportAdminAuditLogs({ format: 'csv', role: 'all' }, { db, adminId: String(actor), ip: '203.0.113.5', userAgent: 'Test Device', normalizeRole: normalizeAdminRole });
  assert.equal(result.total, 1); assert.equal(logs.rows.at(-1).action, 'ADMIN_AUDIT_LOG_EXPORT'); assert.equal(logs.rows.at(-1).details.metadata.format, 'csv');
});
