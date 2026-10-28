const PIPELINE = ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED', 'SITE_VISIT_DONE', 'QUOTATION', 'CONVERTED'];

// Stages each role may move a lead into
const ROLE_ALLOWED_STAGES = {
  telecaller: ['NEW', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP', 'SITE_VISIT_PLANNED'],
  'sales executer': ['SITE_VISIT_PLANNED', 'SITE_VISIT_DONE'],
  manager: PIPELINE,
  admin: PIPELINE,
};

function stageIndex(stage) {
  return PIPELINE.indexOf(stage);
}

function canRoleSetStage(role, newStage) {
  return ROLE_ALLOWED_STAGES[role]?.includes(newStage) || false;
}

function validateTransition({ role, oldStage, newStage, notes, followUpDate }) {
  if (!PIPELINE.includes(newStage)) {
    return { valid: false, message: `Invalid stage "${newStage}"` };
  }
  if (!canRoleSetStage(role, newStage)) {
    return { valid: false, message: `Your role is not permitted to set stage "${newStage.replace(/_/g, ' ')}"` };
  }
  if (!notes || !notes.trim()) {
    return { valid: false, message: 'Notes are required for a stage change.' };
  }
  if (newStage === 'FOLLOW_UP' && !followUpDate) {
    return { valid: false, message: 'Next call date is required for Follow-up.' };
  }
  return { valid: true };
}

module.exports = { PIPELINE, validateTransition, ROLE_ALLOWED_STAGES };