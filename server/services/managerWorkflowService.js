const validateVisitAssignment = ({
  scheduledAt,
  address,
  priority,
  notes,
  leadStage,
  executiveRole,
  executiveTeamIds = [],
  managerTeamIds = [],
  isAdmin = false,
  now = new Date(),
}) => {
  if (!scheduledAt || !address?.trim() || !priority || !notes?.trim()) return 'All site visit fields are required.';
  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= now) return 'Site visit date must be in the future.';
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(priority)) return 'Priority must be LOW, MEDIUM, or HIGH.';
  if (leadStage !== 'SITE_VISIT_PLANNED') return 'Lead must reach Site Visit Planned before scheduling a visit.';
  if (executiveRole !== 'sales executer') return 'Site visits can only be assigned to Sales Executives.';
  const sameTeam = executiveTeamIds.some((id) => managerTeamIds.some((teamId) => String(teamId) === String(id)));
  if (!isAdmin && !sameTeam) return 'Selected Sales Executive is not part of your team.';
  return null;
};

const validateManualLeadAssignment = ({
  selectedLeadCount,
  matchedLeadCount,
  assigneeRole,
  assigneeTeamIds = [],
  managerTeamIds = [],
  isAdmin = false,
}) => {
  if (!selectedLeadCount || selectedLeadCount !== matchedLeadCount) {
    return 'Every selected lead must be unassigned and belong to your team.';
  }
  if (assigneeRole !== 'telecaller') return 'Leads may only be assigned to Telecallers.';
  const sameTeam = assigneeTeamIds.some((id) => managerTeamIds.some((teamId) => String(teamId) === String(id)));
  if (!isAdmin && !sameTeam) return 'Selected Telecaller is not part of your team.';
  return null;
};

const attendanceRange = (period = 'week', today = new Date()) => {
  const todayKey = today.toISOString().slice(0, 10);
  if (period === 'all') return {};
  if (period === 'today') return { date: todayKey };
  const weekStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dayOfWeek = weekStart.getUTCDay() || 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - dayOfWeek + 1);
  return { date: { $gte: weekStart.toISOString().slice(0, 10), $lte: todayKey } };
};

module.exports = { validateVisitAssignment, validateManualLeadAssignment, attendanceRange };