const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRow } = require('../services/importService');

const seenInBatch = () => ({ emails: new Set(), phones: new Set() });
const row = (email, phone) => ({ Name: 'Lead', Company: 'Build Co', Email: email, Phone: phone, Source: 'referral' });
const noExistingLead = { findOne: () => ({ select: async () => null }) };

test('same-file import detects duplicate emails even when phone differs', async () => {
  const seen = seenInBatch();
  const first = await validateRow(row('same@example.com', '5551112222'), 2, new Map(), seen, noExistingLead);
  const duplicate = await validateRow(row('same@example.com', '5553334444'), 3, new Map(), seen, noExistingLead);

  assert.equal(first.status, 'valid');
  assert.equal(duplicate.status, 'duplicate');
});

test('same-file import detects duplicate phones even when email differs', async () => {
  const seen = seenInBatch();
  const first = await validateRow(row('first@example.com', '(555) 111-2222'), 2, new Map(), seen, noExistingLead);
  const duplicate = await validateRow(row('second@example.com', '5551112222'), 3, new Map(), seen, noExistingLead);

  assert.equal(first.status, 'valid');
  assert.equal(duplicate.status, 'duplicate');
});

test('lead import accepts either a valid phone or email as contact', async () => {
  const emailOnly = await validateRow(row('only@example.com', ''), 2, new Map(), seenInBatch(), noExistingLead);
  const phoneOnly = await validateRow(row('', '5551112222'), 3, new Map(), seenInBatch(), noExistingLead);

  assert.equal(emailOnly.status, 'valid');
  assert.equal(phoneOnly.status, 'valid');
});