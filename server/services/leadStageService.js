const PIPELINE = ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'];

// Stages each role may move a lead into; assignment itself is a manager workflow.
const ROLE_ALLOWED_STAGES = {
  telecaller: ['CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED'],
  'sales executer': [],
  manager: ['QUOTATION', 'CONVERTED'],
  admin: PIPELINE.slice(1),
};

function stageIndex(stage) {
  return PIPELINE.indexOf(stage);
}

function isSequential(oldStage, newStage) {
  const oldIdx = stageIndex(oldStage);
  const newIdx = stageIndex(newStage);
  if (oldIdx === -1 || newIdx === -1) return false;
  return newIdx === oldIdx + 1;
}

function canRoleSetStage(role, newStage) {
  return ROLE_ALLOWED_STAGES[role]?.includes(newStage) || false;
}

function validateTransition({ role, oldStage, newStage, notes, followUpDate }) {
  if (!PIPELINE.includes(newStage)) {
    return { valid: false, message: `Invalid stage "${newStage}"` };
  }
  if (!isSequential(oldStage, newStage)) {
    return { valid: false, message: `Stage must move forward one step from ${oldStage}.` };
  }
  if (!canRoleSetStage(role, newStage)) {
    return { valid: false, message: `Your role is not permitted to set stage "${newStage}"` };
  }
  if (!notes || !notes.trim()) {
    return { valid: false, message: 'Notes are required for a stage change.' };
  }
  if (newStage === 'FOLLOW_UP' && !followUpDate) {
    return { valid: false, message: 'Next call date is required for Follow-up.' };
  }
  if (newStage === 'FOLLOW_UP' && new Date(followUpDate) <= new Date()) {
    return { valid: false, message: 'Next call date must be in the future.' };
  }
  return { valid: true };
}

module.exports = { PIPELINE, validateTransition };