const VALID_ROLES = ['admin', 'manager', 'telecaller', 'sales executer'];
const VALID_DEPARTMENTS = ['sales', 'marketing', 'operations', 'management'];
const VALID_PERMISSIONS = [
  'manage_leads', 'manage_remarks', 'manage_stages',
  'manage_reminders', 'manage_users', 'view_analytics',
  'import_data', 'export_data',
];

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateCreateUser = (data) => {
  const errors = [];
  const { name, email, password, phone, role, department } = data;

  if (!name || !name.trim()) errors.push('Name is required');
  if (!email || !email.trim()) errors.push('Email is required');
  else if (!isValidEmail(email)) errors.push('Please provide a valid email');
  if (!password || password.length < 6) errors.push('Password must be at least 6 characters');
  if (!phone || !phone.trim()) errors.push('Phone number is required');
  if (role && !VALID_ROLES.includes(role)) errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}`);
  if (department && !VALID_DEPARTMENTS.includes(department)) {
    errors.push(`Department must be one of: ${VALID_DEPARTMENTS.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
};

const validateUpdateUser = (data) => {
  const errors = [];
  const { email, phone, role, department } = data;

  if (email !== undefined) {
    if (!email.trim()) errors.push('Email cannot be empty');
    else if (!isValidEmail(email)) errors.push('Please provide a valid email');
  }
  if (phone !== undefined && !phone.trim()) errors.push('Phone cannot be empty');
  if (role !== undefined && !VALID_ROLES.includes(role)) {
    errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}`);
  }
  if (department !== undefined && !VALID_DEPARTMENTS.includes(department)) {
    errors.push(`Department must be one of: ${VALID_DEPARTMENTS.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
};

const validateResetPassword = (data) => {
  const errors = [];
  if (!data.newPassword || data.newPassword.length < 6) {
    errors.push('New password must be at least 6 characters');
  }
  return { valid: errors.length === 0, errors };
};

const validateAssignRole = (data) => {
  const errors = [];
  if (!data.role || !VALID_ROLES.includes(data.role)) {
    errors.push(`Role must be one of: ${VALID_ROLES.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
};

const validateAssignPermissions = (data) => {
  const errors = [];
  if (!Array.isArray(data.permissions)) {
    errors.push('Permissions must be an array');
  } else {
    const invalid = data.permissions.filter((p) => !VALID_PERMISSIONS.includes(p));
    if (invalid.length > 0) {
      errors.push(`Invalid permission(s): ${invalid.join(', ')}`);
    }
  }
  return { valid: errors.length === 0, errors };
};

module.exports = {
  VALID_ROLES,
  VALID_DEPARTMENTS,
  VALID_PERMISSIONS,
  validateCreateUser,
  validateUpdateUser,
  validateResetPassword,
  validateAssignRole,
  validateAssignPermissions,
};