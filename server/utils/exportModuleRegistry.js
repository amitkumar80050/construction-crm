// Central registry describing every exportable module: its model,
// which fields map to which columns, and how to scope records by role.
// To add a module, add an entry here — nothing else needs to change.

const registry = {};

function safeRegister(key, loader) {
  try {
    const config = loader();
    registry[key] = config;
  } catch (error) {
    console.warn(`[exportModuleRegistry] Skipped "${key}": ${error.message}`);
  }
}

// --- Leads / Clients ---
safeRegister('leads', () => {
  const Client = require('../models/Client'); // adjust if your model is named differently
  return {
    label: 'Leads',
    model: Client,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'company', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status' },
      { key: 'stage', label: 'Stage' },
      { key: 'projectValue', label: 'Project Value' },
      { key: 'assignedTo', label: 'Assigned To' },
      { key: 'createdAt', label: 'Created At' },
    ],
    // Restricts the Mongo query for non-admin users
    applyScope: (query, user) => {
      if (user.role !== 'admin') {
        query.assignedTo = user.id;
      }
      return query;
    },
    // Maps arbitrary UI filters -> Mongo query fragment
    applyFilters: (query, filters) => {
      if (filters.status) query.status = filters.status;
      if (filters.stage) query.stage = filters.stage;
      if (filters.source) query.source = filters.source;
      if (filters.city) query.city = new RegExp(filters.city, 'i');
      if (filters.state) query.state = new RegExp(filters.state, 'i');
      if (filters.assignedUser) query.assignedTo = filters.assignedUser;
      if (filters.priority) query.priority = filters.priority;
      if (filters.minBudget || filters.maxBudget) {
        query.projectValue = {};
        if (filters.minBudget) query.projectValue.$gte = Number(filters.minBudget);
        if (filters.maxBudget) query.projectValue.$lte = Number(filters.maxBudget);
      }
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }
      return query;
    },
  };
});

// --- Users ---
safeRegister('users', () => {
  const User = require('../models/User');
  return {
    label: 'Users',
    model: User,
    columns: [
      { key: 'userId', label: 'User ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'isActive', label: 'Active' },
      { key: 'lastLogin', label: 'Last Login' },
    ],
    applyScope: (query, user) => {
      // Only admins may export the user list at all — enforced again in controller
      return query;
    },
    applyFilters: (query, filters) => {
      if (filters.status) query.isActive = filters.status === 'active';
      return query;
    },
    adminOnly: true,
  };
});

// --- Activity Logs ---
safeRegister('activityLogs', () => {
  const Activity = require('../models/Activity');
  return {
    label: 'Activity Logs',
    model: Activity,
    columns: [
      { key: 'user', label: 'User' },
      { key: 'type', label: 'Type' },
      { key: 'module', label: 'Module' },
      { key: 'description', label: 'Description' },
      { key: 'createdAt', label: 'Date' },
    ],
    applyScope: (query, user) => {
      if (user.role !== 'admin') query.user = user.id;
      return query;
    },
    applyFilters: (query, filters) => {
      if (filters.createdBy) query.user = filters.createdBy;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }
      return query;
    },
    adminOnly: false,
  };
});

// --- Not yet wired up: model names unconfirmed ---
// Uncomment and adjust once you confirm the actual model file for each.
//
// safeRegister('customers', () => { ... });
// safeRegister('projects', () => { ... });
// safeRegister('followups', () => { ... });
// safeRegister('reminders', () => {
//   const Reminder = require('../models/Reminder');
//   ...
// });
// safeRegister('leadSources', () => { ... });
// safeRegister('leadStages', () => {
//   const Stage = require('../models/Stage');
//   ...
// });
// safeRegister('analytics', () => { ... });
// safeRegister('dashboard', () => { ... });

function getModule(key) {
  return registry[key] || null;
}

function listModules() {
  return Object.entries(registry).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    columns: cfg.columns,
  }));
}

module.exports = { getModule, listModules };