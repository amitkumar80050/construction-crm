const syncTeamManagerMembership = async ({ Team, User, teamId, previousManagerId, nextManagerId }) => {
  const previousId = previousManagerId ? String(previousManagerId) : null;
  const nextId = nextManagerId ? String(nextManagerId) : null;

  if (previousId && previousId !== nextId) {
    const stillLeadsTeam = await Team.exists({
      _id: { $ne: teamId },
      teamLead: previousManagerId,
    });
    if (!stillLeadsTeam) {
      await User.updateOne({ _id: previousManagerId }, { $pull: { teamIds: teamId } });
    }
  }

  if (nextManagerId) {
    await User.updateOne({ _id: nextManagerId }, { $addToSet: { teamIds: teamId } });
  }
};

const deleteTeamIfEmpty = async ({ Team, User, teamId }) => {
  const team = await Team.findById(teamId);
  if (!team) return { team: null, memberCount: 0, deleted: false };

  const memberCount = await User.countDocuments({ teamIds: team._id });
  if (memberCount > 0) return { team, memberCount, deleted: false };

  await team.deleteOne();
  return { team, memberCount: 0, deleted: true };
};

module.exports = { syncTeamManagerMembership, deleteTeamIfEmpty };