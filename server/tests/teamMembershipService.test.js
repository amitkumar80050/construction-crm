const test = require('node:test');
const assert = require('node:assert/strict');
const { syncTeamManagerMembership, deleteTeamIfEmpty } = require('../services/teamMembershipService');

test('assigning a manager to a team adds that team to the manager membership', async () => {
  let update;
  await syncTeamManagerMembership({
    Team: { exists: async () => false },
    User: { updateOne: async (query, operation) => { update = { query, operation }; } },
    teamId: 'team-1',
    nextManagerId: 'manager-1',
  });

  assert.deepEqual(update, {
    query: { _id: 'manager-1' },
    operation: { $addToSet: { teamIds: 'team-1' } },
  });
});

test('replacing a team manager removes only the old team membership and links the new manager', async () => {
  const updates = [];
  await syncTeamManagerMembership({
    Team: { exists: async () => false },
    User: { updateOne: async (query, operation) => updates.push({ query, operation }) },
    teamId: 'team-1',
    previousManagerId: 'manager-1',
    nextManagerId: 'manager-2',
  });

  assert.deepEqual(updates, [
    { query: { _id: 'manager-1' }, operation: { $pull: { teamIds: 'team-1' } } },
    { query: { _id: 'manager-2' }, operation: { $addToSet: { teamIds: 'team-1' } } },
  ]);
});

test('a manager keeps membership in another team they still lead', async () => {
  const updates = [];
  await syncTeamManagerMembership({
    Team: { exists: async () => true },
    User: { updateOne: async (query, operation) => updates.push({ query, operation }) },
    teamId: 'team-1',
    previousManagerId: 'manager-1',
  });

  assert.deepEqual(updates, []);
});

test('a team with members cannot be deleted', async () => {
  let deleted = false;
  const team = { _id: 'team-1', async deleteOne() { deleted = true; } };
  const result = await deleteTeamIfEmpty({
    Team: { findById: async () => team },
    User: { countDocuments: async () => 2 },
    teamId: 'team-1',
  });

  assert.equal(result.deleted, false);
  assert.equal(result.memberCount, 2);
  assert.equal(deleted, false);
});

test('an empty team can be deleted', async () => {
  let deleted = false;
  const team = { _id: 'team-1', async deleteOne() { deleted = true; } };
  const result = await deleteTeamIfEmpty({
    Team: { findById: async () => team },
    User: { countDocuments: async () => 0 },
    teamId: 'team-1',
  });

  assert.equal(result.deleted, true);
  assert.equal(deleted, true);
});