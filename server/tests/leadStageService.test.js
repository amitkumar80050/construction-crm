const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTransition } = require('../services/leadStageService');

const validNotes = 'Recorded the latest customer update.';

test('rejects a skipped stage', () => {
  const result = validateTransition({
    role: 'telecaller',
    oldStage: 'NEW',
    newStage: 'INTERESTED',
    notes: validNotes,
  });
  assert.equal(result.valid, false);
});

test('rejects moving backwards through the pipeline', () => {
  const result = validateTransition({
    role: 'telecaller',
    oldStage: 'CONNECTED',
    newStage: 'NEW',
    notes: validNotes,
  });
  assert.equal(result.valid, false);
});

test('telecaller can advance a lead to site visit planned', () => {
  const result = validateTransition({
    role: 'telecaller',
    oldStage: 'FOLLOW_UP',
    newStage: 'SITE_VISIT_PLANNED',
    notes: validNotes,
  });
  assert.equal(result.valid, true);
});

test('sales executive cannot complete a visit through the stage endpoint', () => {
  const result = validateTransition({
    role: 'sales executer',
    oldStage: 'SITE_VISIT_PLANNED',
    newStage: 'SITE_VISIT_DONE',
    notes: validNotes,
  });
  assert.equal(result.valid, false);
});

test('manager can finalize quotation and conversion but not telecaller stages', () => {
  assert.equal(validateTransition({
    role: 'manager', oldStage: 'SITE_VISIT_DONE', newStage: 'QUOTATION', notes: validNotes,
  }).valid, true);
  assert.equal(validateTransition({
    role: 'manager', oldStage: 'NEW', newStage: 'CONNECTED', notes: validNotes,
  }).valid, false);
});