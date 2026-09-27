const test = require('node:test');
const assert = require('node:assert/strict');
const SiteVisit = require('../models/SiteVisit');
const Client = require('../models/Client');
const Activity = require('../models/Activity');
const { markNotDone } = require('../controllers/siteVisitController.js.js');

test('marking a legacy visit not done does not validate unrelated missing address', async () => {
  const originalFindById = SiteVisit.findById;
  const originalFindOneAndUpdate = SiteVisit.findOneAndUpdate;
  const originalClientFindById = Client.findById;
  const originalActivityCreate = Activity.create;
  const existingVisit = {
    _id: 'visit-1',
    assignedTo: 'user-1',
    lead: 'lead-1',
    address: undefined,
  };
  let updateArgs;

  SiteVisit.findById = async () => existingVisit;
  SiteVisit.findOneAndUpdate = async (...args) => {
    updateArgs = args;
    return { ...existingVisit, ...args[1].$set };
  };
  Client.findById = () => ({ select: async () => null });
  Activity.create = async () => {};

  try {
    const req = {
      params: { id: 'visit-1' },
      body: { notDoneReason: 'Customer unavailable', nextDate: '2026-09-28' },
      user: { id: 'user-1' },
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };

    await markNotDone(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.status, 'MISSED');
    assert.equal(res.body.data.notDoneReason, 'Customer unavailable');
    assert.deepEqual(updateArgs[0], { _id: 'visit-1', assignedTo: 'user-1' });
    assert.deepEqual(updateArgs[1].$set, {
      status: 'MISSED',
      notDoneReason: 'Customer unavailable',
      nextDate: '2026-09-28',
    });
    assert.deepEqual(updateArgs[2], { new: true, runValidators: true });
  } finally {
    SiteVisit.findById = originalFindById;
    SiteVisit.findOneAndUpdate = originalFindOneAndUpdate;
    Client.findById = originalClientFindById;
    Activity.create = originalActivityCreate;
  }
});