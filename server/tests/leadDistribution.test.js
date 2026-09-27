const test = require('node:test');
const assert = require('node:assert/strict');
const Client = require('../models/Client');
const User = require('../models/User');
const { distributeLeads } = require('../controllers/leadDistributionController');

test('distribution with no unassigned leads returns a successful empty result', async () => {
  const originalUserFind = User.find;
  const originalClientFind = Client.find;
  let leadFilter;

  User.find = () => ({
    select: async () => [{ _id: 'telecaller-1', name: 'Taylor Caller', role: 'telecaller' }],
  });
  Client.find = (filter) => {
    leadFilter = filter;
    return { limit: async () => [] };
  };

  try {
    const req = {
      body: { roleFilter: 'telecaller' },
      user: { _id: 'admin-1', role: 'admin' },
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };

    await distributeLeads(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      success: true,
      message: 'No unassigned leads found to distribute.',
      totalDistributed: 0,
      breakdown: {},
    });
    assert.deepEqual(leadFilter, { $or: [{ assignedTo: null }, { assignedTo: 'admin-1' }] });
  } finally {
    User.find = originalUserFind;
    Client.find = originalClientFind;
  }
});