const mongoose = require('mongoose');

// Single Settings document, grouped by section (per your spec).
// Only one document should ever exist — enforced via a fixed singleton key.

const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true }, // ensures only 1 doc

    company: {
      name: { type: String, default: 'Construction CRM' },
      logo: { type: String, default: '' },
      favicon: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      alternatePhone: { type: String, default: '' },
      website: { type: String, default: '' },
      gstNumber: { type: String, default: '' },
      panNumber: { type: String, default: '' },
      registrationNumber: { type: String, default: '' },
      address: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'India' },
      pincode: { type: String, default: '' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      currency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
      financialYearStart: { type: String, default: 'April' },
      businessHoursStart: { type: String, default: '09:00' },
      businessHoursEnd: { type: String, default: '18:00' },
      description: { type: String, default: '' },
    },

    theme: {
      mode: { type: String, enum: ['light', 'dark'], default: 'light' },
      sidebarColor: { type: String, default: '#0f172a' },
      navbarColor: { type: String, default: '#ffffff' },
      primaryColor: { type: String, default: '#2563eb' },
      buttonStyle: { type: String, enum: ['rounded', 'square', 'pill'], default: 'rounded' },
      fontFamily: { type: String, default: 'Inter, sans-serif' },
      fontSize: { type: String, default: '14px' },
      borderRadius: { type: String, default: '8px' },
      sidebarCollapsedByDefault: { type: Boolean, default: false },
      stickyHeader: { type: Boolean, default: true },
      layoutWidth: { type: String, enum: ['fluid', 'boxed'], default: 'fluid' },
    },

    crm: {
      leadNumberPrefix: { type: String, default: 'LD-' },
      customerIdPrefix: { type: String, default: 'CUST-' },
      autoGenerateLeadNumber: { type: Boolean, default: true },
      autoAssignLeads: { type: Boolean, default: false },
      defaultLeadStatus: { type: String, default: 'lead' },
      defaultReminderTimeMinutes: { type: Number, default: 30 },
      defaultFollowupDays: { type: Number, default: 3 },
      duplicateLeadDetection: { type: Boolean, default: true },
      leadSources: { type: [String], default: ['Website', 'Referral', 'Cold Call', 'Social Media'] },
      leadStages: { type: [String], default: ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'] },
      callStatusList: { type: [String], default: ['Answered', 'Not Answered', 'Busy', 'Switched Off'] },
      budgetRanges: { type: [String], default: ['<10L', '10L-25L', '25L-50L', '50L+'] },
      projectTypes: { type: [String], default: ['Residential', 'Commercial', 'Industrial'] },
    },

    notifications: {
      emailNotification: { type: Boolean, default: true },
      smsNotification: { type: Boolean, default: false },
      browserNotification: { type: Boolean, default: true },
      reminderNotification: { type: Boolean, default: true },
      leadAssignmentNotification: { type: Boolean, default: true },
      passwordChangeNotification: { type: Boolean, default: true },
    },

    security: {
      passwordMinLength: { type: Number, default: 8 },
      passwordExpiryDays: { type: Number, default: 0 }, // 0 = never
      sessionTimeoutMinutes: { type: Number, default: 60 },
      maxLoginAttempts: { type: Number, default: 5 },
      accountLockDurationMinutes: { type: Number, default: 15 },
      jwtExpiry: { type: String, default: '1d' },
      refreshTokenExpiry: { type: String, default: '7d' },
      twoFactorEnabled: { type: Boolean, default: false }, // not yet implemented — see note
      activityLogEnabled: { type: Boolean, default: true },
      auditLogEnabled: { type: Boolean, default: true },
    },

    email: {
      smtpHost: { type: String, default: '' },
      smtpPort: { type: Number, default: 587 },
      smtpUsername: { type: String, default: '' },
      smtpPassword: { type: String, default: '', select: false }, // never returned by default
      encryptionType: { type: String, enum: ['none', 'tls', 'ssl'], default: 'tls' },
      senderName: { type: String, default: 'Construction CRM' },
      senderEmail: { type: String, default: '' },
    },

    fileUpload: {
      maxUploadSizeMB: { type: Number, default: 5 },
      allowedImageExtensions: { type: [String], default: ['jpg', 'jpeg', 'png', 'gif'] },
      allowedDocumentExtensions: { type: [String], default: ['pdf', 'doc', 'docx'] },
      allowedExcelExtensions: { type: [String], default: ['xls', 'xlsx', 'csv'] },
    },

    system: {
      applicationName: { type: String, default: 'Construction CRM' },
      applicationVersion: { type: String, default: '1.0.0' },
      maintenanceMode: { type: Boolean, default: false },
      maintenanceMessage: { type: String, default: 'We are performing scheduled maintenance. Please check back soon.' },
      enableForgotPassword: { type: Boolean, default: true },
      enableEmailVerification: { type: Boolean, default: false },
      enableMobileVerification: { type: Boolean, default: false },
    },

    dashboard: {
      refreshTimeSeconds: { type: Number, default: 0 }, // 0 = manual refresh only
      defaultDashboard: { type: String, default: 'overview' },
      visibleCards: {
        type: [String],
        default: ['totalLeads', 'activeLeads', 'closedLeads', 'lostLeads'],
      },
      visibleCharts: { type: [String], default: ['stageDistribution', 'leadTrend'] },
    },

    backup: {
      autoBackupEnabled: { type: Boolean, default: false },
      backupSchedule: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'weekly' },
      lastBackupAt: { type: Date, default: null },
      lastRestoreAt: { type: Date, default: null },
    },

    activityLog: {
      enabled: { type: Boolean, default: true },
      retentionDays: { type: Number, default: 90 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);