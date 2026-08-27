const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,15}$/;

// Configuration for the Leads module — mirrors your Client schema.
// To support other modules (customers, projects, etc.), add a matching config object.
const LEAD_FIELD_CONFIG = {
  required: ['name', 'phone', 'company', 'email'], // email added — Client schema requires it
  maxLengths: { name: 100, company: 100, email: 100, notes: 2000 },
};

/**
 * Validates a single normalized lead row.
 * Returns { valid: boolean, errors: [{ column, value, reason, suggestedFix }] }
 */
function validateLeadRow(row, rowIndex, validStages = [], validUsers = []) {
  const errors = [];

  // Required fields
  for (const field of LEAD_FIELD_CONFIG.required) {
    if (!row[field] || String(row[field]).trim() === '') {
      errors.push({
        row: rowIndex,
        column: field,
        value: row[field] ?? '',
        reason: `${field} is required`,
        suggestedFix: `Provide a value for ${field}`,
      });
    }
  }

  // Email format
  if (row.email && !EMAIL_REGEX.test(row.email)) {
    errors.push({
      row: rowIndex,
      column: 'email',
      value: row.email,
      reason: 'Invalid email format',
      suggestedFix: 'Use format name@example.com',
    });
  }

  // Phone format
  if (row.phone && !PHONE_REGEX.test(row.phone)) {
    errors.push({
      row: rowIndex,
      column: 'phone',
      value: row.phone,
      reason: 'Invalid phone number format',
      suggestedFix: 'Use digits only, 7-15 characters, may include + - ( )',
    });
  }

  // Budget/projectValue must be a valid non-negative number if provided
  if (row.projectValue !== undefined && row.projectValue !== '') {
    const num = Number(row.projectValue);
    if (isNaN(num) || num < 0) {
      errors.push({
        row: rowIndex,
        column: 'projectValue',
        value: row.projectValue,
        reason: 'Project value must be a valid non-negative number',
        suggestedFix: 'Enter a numeric value, e.g. 50000',
      });
    }
  }

  // Max length checks
  for (const [field, maxLen] of Object.entries(LEAD_FIELD_CONFIG.maxLengths)) {
    if (row[field] && String(row[field]).length > maxLen) {
      errors.push({
        row: rowIndex,
        column: field,
        value: row[field],
        reason: `${field} exceeds maximum length of ${maxLen} characters`,
        suggestedFix: `Shorten ${field} to ${maxLen} characters or fewer`,
      });
    }
  }

  // Stage validation (if provided, must match an existing stage name)
  if (row.stage && validStages.length > 0) {
    const match = validStages.find(
      (s) => s.name.toLowerCase() === String(row.stage).trim().toLowerCase()
    );
    if (!match) {
      errors.push({
        row: rowIndex,
        column: 'stage',
        value: row.stage,
        reason: 'Stage does not match any existing stage',
        suggestedFix: `Valid stages: ${validStages.map((s) => s.name).join(', ')}`,
      });
    }
  }

  // Assigned user validation (if provided, must match an existing user's email or name)
  if (row.assignedTo && validUsers.length > 0) {
    const match = validUsers.find(
      (u) =>
        u.email.toLowerCase() === String(row.assignedTo).trim().toLowerCase() ||
        u.name.toLowerCase() === String(row.assignedTo).trim().toLowerCase()
    );
    if (!match) {
      errors.push({
        row: rowIndex,
        column: 'assignedTo',
        value: row.assignedTo,
        reason: 'Assigned user not found',
        suggestedFix: 'Use a valid existing user email or full name',
      });
    }
  }

  // Reject rows that are entirely empty
  const isEmptyRow = Object.values(row).every((v) => v === undefined || v === null || String(v).trim() === '');
  if (isEmptyRow) {
    errors.push({
      row: rowIndex,
      column: '*',
      value: '',
      reason: 'Empty row',
      suggestedFix: 'Remove blank rows from the source file',
    });
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateLeadRow, EMAIL_REGEX, PHONE_REGEX };