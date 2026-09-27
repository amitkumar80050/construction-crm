const test = require('node:test');
const assert = require('node:assert/strict');
const { createCanManageUser } = require('../middleware/teamAuthMiddleware');

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const authorize = async (manager, target) => {
  const middleware = createCanManageUser({ findById: async () => target });
  const req = { user: manager, params: { id: target._id } };
  const res = response();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  return { req, res, nextCalled };
};

test('a manager may manage a telecaller in their own team', async () => {
  const result = await authorize(
    { id: 'manager-1', role: 'manager', teamIds: ['team-a'] },
    { _id: 'user-1', role: 'telecaller', teamIds: ['team-a'] },
  );
  assert.equal(result.nextCalled, true);
  assert.equal(result.req.targetUser._id, 'user-1');
});

test('a manager cannot manage a user from another team', async () => {
  const result = await authorize(
    { id: 'manager-1', role: 'manager', teamIds: ['team-a'] },
    { _id: 'user-1', role: 'sales executer', teamIds: ['team-b'] },
  );
  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 403);
});

test('a manager cannot manage an Admin or another Manager, even in their team', async () => {
  const manager = { id: 'manager-1', role: 'manager', teamIds: ['team-a'] };
  for (const role of ['admin', 'manager']) {
    const result = await authorize(manager, { _id: 'user-1', role, teamIds: ['team-a'] });
    assert.equal(result.nextCalled, false);
    assert.equal(result.res.statusCode, 403);
  }
});

test('an admin can manage users across teams', async () => {
  const result = await authorize(
    { id: 'admin-1', role: 'admin', teamIds: [] },
    { _id: 'user-1', role: 'telecaller', teamIds: ['team-b'] },
  );
  assert.equal(result.nextCalled, true);
});