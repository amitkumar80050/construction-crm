const test = require('node:test');
const assert = require('node:assert/strict');
const Activity = require('../models/Activity');
const Client = require('../models/Client');
const { createLead } = require('../controllers/leadController');
const { validateCreateUser } = require('../validations/userValidation');
const { auditViewer, isAllowedAuditorRequest } = require('../middleware/authMiddleware');

test('creating a lead records an attributable audit event', async () => {
  const originalFindOne = Client.findOne;
  const originalGenerateClientId = Client.generateClientId;
  const originalCreate = Client.create;
  const originalActivityCreate = Activity.create;
  let activity;

  Client.findOne = () => ({ select: async () => null });
  Client.generateClientId = async () => 'CLT-9001';
  Client.create = async (data) => ({ _id: 'lead-1', ...data });
  Activity.create = async (data) => { activity = data; };

  try {
    const req = {
      body: { name: 'Audit Lead', source: 'call', phone: '5551234567' },
      ip: '127.0.0.1',
      get: () => 'test-agent',
      user: { id: 'telecaller-1', userId: 'CON-00021', name: 'Taylor Caller', role: 'telecaller', teamIds: [] },
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };

    await createLead(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(activity.user, 'telecaller-1');
    assert.equal(activity.userIdSnapshot, 'CON-00021');
    assert.equal(activity.userNameSnapshot, 'Taylor Caller');
    assert.equal(activity.type, 'create');
    assert.equal(activity.module, 'client');
    assert.equal(activity.targetId, 'lead-1');
    assert.equal(activity.targetType, 'Client');
    assert.equal(activity.ipAddress, '127.0.0.1');
    assert.equal(activity.userAgent, 'test-agent');
  } finally {
    Client.findOne = originalFindOne;
    Client.generateClientId = originalGenerateClientId;
    Client.create = originalCreate;
    Activity.create = originalActivityCreate;
  }
});

test('Auditor is a valid read-only account role', () => {
  assert.equal(validateCreateUser({
    name: 'Audit Reader',
    email: 'audit@example.com',
    password: 'secret1',
    phone: '5551234567',
    role: 'auditor',
  }).valid, true);
});

test('only admins and auditors pass the organization-wide audit guard', () => {
  const authorize = (role) => {
    const result = { statusCode: null, next: false };
    auditViewer(
      { user: { role } },
      { status(code) { result.statusCode = code; return this; }, json() {} },
      () => { result.next = true; },
    );
    return result;
  };

  assert.equal(authorize('auditor').next, true);
  assert.equal(authorize('admin').next, true);
  assert.equal(authorize('telecaller').statusCode, 403);
});

test('Auditor API access is read-only and limited to audit and session data', () => {
  assert.equal(isAllowedAuditorRequest({ method: 'GET', originalUrl: '/api/admin/logs?page=1' }), true);
  assert.equal(isAllowedAuditorRequest({ method: 'GET', originalUrl: '/api/auth/me' }), true);
  assert.equal(isAllowedAuditorRequest({ method: 'GET', originalUrl: '/api/notifications' }), true);
  assert.equal(isAllowedAuditorRequest({ method: 'GET', originalUrl: '/api/clients' }), false);
  assert.equal(isAllowedAuditorRequest({ method: 'PUT', originalUrl: '/api/admin/logs' }), false);
  assert.equal(isAllowedAuditorRequest({ method: 'POST', originalUrl: '/api/auth/logout' }), true);
});