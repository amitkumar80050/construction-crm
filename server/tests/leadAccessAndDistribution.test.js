const test = require('node:test');
const assert = require('node:assert/strict');
const { canAccessLead, canReassignLead, canAssignToRole } = require('../controllers/leadController');
const { roundRobinAssignments } = require('../services/leadDistributionService');

test('manager can access leads assigned to their team', async () => {
  const User = { findById: () => ({ select: async () => ({ teamIds: ['team-a'] }) }) };
  const allowed = await canAccessLead(
    { assignedTo: 'employee-1', team: null },
    { user: { id: 'manager-1', role: 'manager', teamIds: ['team-a'] } },
    User,
  );
  assert.equal(allowed, true);
});

test('manager cannot access a lead owned by another team', async () => {
  const User = { findById: () => ({ select: async () => ({ teamIds: ['team-b'] }) }) };
  const allowed = await canAccessLead(
    { assignedTo: 'employee-1', team: null },
    { user: { id: 'manager-1', role: 'manager', teamIds: ['team-a'] } },
    User,
  );
  assert.equal(allowed, false);
});

test('round-robin distributes leads as evenly as possible', () => {
  const leads = Array.from({ length: 8 }, (_, index) => ({ id: index }));
  const team = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const assignments = roundRobinAssignments(leads, team);
  const counts = team.map((member) => assignments.filter((item) => item.assignee === member).length);

  assert.deepEqual(counts, [3, 3, 2]);
});

test('round-robin safely returns no assignments without eligible users', () => {
  assert.deepEqual(roundRobinAssignments([{ id: 1 }], []), []);
});

test('only managers and admins may reassign leads', () => {
  assert.equal(canReassignLead('admin'), true);
  assert.equal(canReassignLead('manager'), true);
  assert.equal(canReassignLead('telecaller'), false);
  assert.equal(canReassignLead('sales executer'), false);
});

test('Sales Executives can only receive leads at Site Visit Planned', () => {
  assert.equal(canAssignToRole('sales executer', 'SITE_VISIT_PLANNED'), true);
  assert.equal(canAssignToRole('sales executer', 'NEW'), false);
  assert.equal(canAssignToRole('telecaller', 'NEW'), true);
});