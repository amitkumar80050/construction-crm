const test = require('node:test');
const assert = require('node:assert/strict');
const { validateVisitAssignment, validateManualLeadAssignment, attendanceRange } = require('../services/managerWorkflowService');

const baseVisit = {
  scheduledAt: '2026-09-28T10:00:00.000Z',
  address: '12 Build Street',
  priority: 'HIGH',
  notes: 'Customer requested a site inspection.',
  leadStage: 'SITE_VISIT_PLANNED',
  executiveRole: 'sales executer',
  executiveTeamIds: ['team-a'],
  managerTeamIds: ['team-a'],
  now: new Date('2026-09-26T10:00:00.000Z'),
};

test('validates a future site visit for a Sales Executive in the manager team', () => {
  assert.equal(validateVisitAssignment(baseVisit), null);
});

test('rejects assigning a Sales Executive outside the manager team', () => {
  assert.match(validateVisitAssignment({ ...baseVisit, executiveTeamIds: ['team-b'] }), /not part of your team/);
});

test('rejects site visit scheduling before Site Visit Planned', () => {
  assert.match(validateVisitAssignment({ ...baseVisit, leadStage: 'FOLLOW_UP' }), /Site Visit Planned/);
});

test('rejects past visits and missing required visit fields', () => {
  assert.match(validateVisitAssignment({ ...baseVisit, scheduledAt: '2026-09-25T10:00:00.000Z' }), /future/);
  assert.match(validateVisitAssignment({ ...baseVisit, address: '' }), /required/);
});

test('attendance range helper supports all, today, and current week', () => {
  const today = new Date('2026-09-26T12:00:00.000Z');
  assert.deepEqual(attendanceRange('today', today), { date: '2026-09-26' });
  assert.deepEqual(attendanceRange('week', today), { date: { $gte: '2026-09-21', $lte: '2026-09-26' } });
  assert.deepEqual(attendanceRange('all', today), {});
});

test('manual assignment accepts selected leads and an in-team Telecaller', () => {
  assert.equal(validateManualLeadAssignment({
    selectedLeadCount: 2,
    matchedLeadCount: 2,
    assigneeRole: 'telecaller',
    assigneeTeamIds: ['team-a'],
    managerTeamIds: ['team-a'],
  }), null);
});

test('manual assignment rejects an out-of-team assignee and stale leads', () => {
  assert.match(validateManualLeadAssignment({
    selectedLeadCount: 2,
    matchedLeadCount: 2,
    assigneeRole: 'telecaller',
    assigneeTeamIds: ['team-b'],
    managerTeamIds: ['team-a'],
  }), /not part of your team/);
  assert.match(validateManualLeadAssignment({
    selectedLeadCount: 2,
    matchedLeadCount: 1,
    assigneeRole: 'telecaller',
    assigneeTeamIds: ['team-a'],
    managerTeamIds: ['team-a'],
  }), /Every selected lead/);
});