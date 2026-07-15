import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FaBuilding, FaPalette, FaLayerGroup, FaBell, FaShieldAlt,
  FaEnvelope, FaCog, FaTachometerAlt, FaFileUpload, FaDatabase, FaHistory
} from 'react-icons/fa';
import settingsService from '../services/settingsService';

const TABS = [
  { key: 'company', label: 'Company', icon: FaBuilding },
  { key: 'theme', label: 'Theme', icon: FaPalette },
  { key: 'crm', label: 'CRM', icon: FaLayerGroup },
  { key: 'notifications', label: 'Notifications', icon: FaBell },
  { key: 'security', label: 'Security', icon: FaShieldAlt },
  { key: 'email', label: 'Email', icon: FaEnvelope },
  { key: 'system', label: 'System', icon: FaCog },
  { key: 'dashboard', label: 'Dashboard', icon: FaTachometerAlt },
  { key: 'fileUpload', label: 'File Upload', icon: FaFileUpload },
  { key: 'backup', label: 'Backup', icon: FaDatabase },
  { key: 'activityLog', label: 'Activity Log', icon: FaHistory },
];

// Maps a schema key to the update function + URL slug used by the API
const SECTION_CONFIG = {
  company: { fn: 'updateCompany' },
  theme: { fn: 'updateTheme' },
  crm: { fn: 'updateCRM' },
  notifications: { fn: 'updateNotification' },
  security: { fn: 'updateSecurity' },
  email: { fn: 'updateEmail' },
  system: { fn: 'updateSystem' },
  dashboard: { fn: 'updateDashboard' },
  fileUpload: { fn: 'updateUpload' },
  backup: { fn: 'updateBackup' },
  activityLog: { fn: 'updateActivityLog' },
};

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' };
const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#334155' };
const fieldWrap = { marginBottom: '16px' };

const Field = ({ label, children }) => (
  <div style={fieldWrap}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px' }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
    <span style={{
      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
      background: checked ? '#22c55e' : '#cbd5e1', transition: '.3s', borderRadius: '24px',
    }}>
      <span style={{
        position: 'absolute', height: '18px', width: '18px', left: checked ? '25px' : '3px', bottom: '3px',
        background: 'white', transition: '.3s', borderRadius: '50%',
      }} />
    </span>
  </label>
);

const ListEditor = ({ items = [], onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft('');
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} style={inputStyle}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="Add item and press Enter" />
        <button type="button" onClick={add} style={{ padding: '0 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Add</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {items.map((item, i) => (
          <span key={i} style={{ padding: '5px 10px', background: '#f1f5f9', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {item}
            <button type="button" onClick={() => remove(i)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await settingsService.getSettings();
        setSettings(res.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateField = (section, field, value) => {
    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleSave = async (section) => {
    setSaving(true);
    try {
      const config = SECTION_CONFIG[section];
      const res = await settingsService[config.fn](settings[section]);
      setSettings(res.data.data);
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await settingsService.uploadLogo(file);
      setSettings((prev) => ({ ...prev, company: { ...prev.company, logo: res.data.data.logo } }));
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFavicon(true);
    try {
      const res = await settingsService.uploadFavicon(file);
      setSettings((prev) => ({ ...prev, company: { ...prev.company, favicon: res.data.data.favicon } }));
      toast.success('Favicon uploaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload favicon');
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddr) {
      toast.error('Enter a recipient email first');
      return;
    }
    try {
      await settingsService.testEmail(testEmailAddr);
      toast.success(`Test email sent to ${testEmailAddr}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    }
  };

  const handleBackupAction = async (action) => {
    try {
      if (action === 'backup') await settingsService.updateBackup(settings.backup); // placeholder trigger
      toast.info('Backup/restore requires additional server-side setup — see documentation notes.');
    } catch (error) {
      toast.error('Action not available yet');
    }
  };

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading settings...</div>;
  if (!settings) return <div style={{ padding: '24px', color: '#ef4444' }}>Failed to load settings.</div>;

  const SaveButton = ({ section }) => (
    <button
      onClick={() => handleSave(section)}
      disabled={saving}
      style={{
        marginTop: '20px', padding: '10px 24px', background: '#2563eb', color: 'white',
        border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600,
      }}
    >
      {saving ? 'Saving...' : 'Save Changes'}
    </button>
  );

  return (
    <div style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* Tab sidebar */}
      <div style={{ width: '220px', flexShrink: 0, background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '12px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
              marginBottom: '4px', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
              background: activeTab === tab.key ? '#eff6ff' : 'transparent',
              color: activeTab === tab.key ? '#2563eb' : '#475569', fontSize: '13px', fontWeight: activeTab === tab.key ? 600 : 400,
            }}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px', maxWidth: '700px' }}>

        {activeTab === 'company' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Company Settings</h3>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Logo</label>
                {settings.company.logo && <img src={settings.company.logo} alt="logo" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 8, display: 'block' }} />}
                <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </div>
              <div>
                <label style={labelStyle}>Favicon</label>
                {settings.company.favicon && <img src={settings.company.favicon} alt="favicon" style={{ width: 32, height: 32, objectFit: 'contain', marginBottom: 8, display: 'block' }} />}
                <input type="file" accept="image/*" onChange={handleFaviconUpload} disabled={uploadingFavicon} />
              </div>
            </div>

            <Field label="Company Name"><input style={inputStyle} value={settings.company.name} onChange={(e) => updateField('company', 'name', e.target.value)} /></Field>
            <Field label="Email"><input style={inputStyle} value={settings.company.email} onChange={(e) => updateField('company', 'email', e.target.value)} /></Field>
            <Field label="Phone"><input style={inputStyle} value={settings.company.phone} onChange={(e) => updateField('company', 'phone', e.target.value)} /></Field>
            <Field label="Alternate Phone"><input style={inputStyle} value={settings.company.alternatePhone} onChange={(e) => updateField('company', 'alternatePhone', e.target.value)} /></Field>
            <Field label="Website"><input style={inputStyle} value={settings.company.website} onChange={(e) => updateField('company', 'website', e.target.value)} /></Field>
            <Field label="GST Number"><input style={inputStyle} value={settings.company.gstNumber} onChange={(e) => updateField('company', 'gstNumber', e.target.value)} /></Field>
            <Field label="PAN Number"><input style={inputStyle} value={settings.company.panNumber} onChange={(e) => updateField('company', 'panNumber', e.target.value)} /></Field>
            <Field label="Registration Number"><input style={inputStyle} value={settings.company.registrationNumber} onChange={(e) => updateField('company', 'registrationNumber', e.target.value)} /></Field>
            <Field label="Address"><textarea style={{ ...inputStyle, minHeight: 60 }} value={settings.company.address} onChange={(e) => updateField('company', 'address', e.target.value)} /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="City"><input style={inputStyle} value={settings.company.city} onChange={(e) => updateField('company', 'city', e.target.value)} /></Field>
              <Field label="State"><input style={inputStyle} value={settings.company.state} onChange={(e) => updateField('company', 'state', e.target.value)} /></Field>
              <Field label="Country"><input style={inputStyle} value={settings.company.country} onChange={(e) => updateField('company', 'country', e.target.value)} /></Field>
              <Field label="Pincode"><input style={inputStyle} value={settings.company.pincode} onChange={(e) => updateField('company', 'pincode', e.target.value)} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Timezone"><input style={inputStyle} value={settings.company.timezone} onChange={(e) => updateField('company', 'timezone', e.target.value)} /></Field>
              <Field label="Currency"><input style={inputStyle} value={settings.company.currency} onChange={(e) => updateField('company', 'currency', e.target.value)} /></Field>
              <Field label="Currency Symbol"><input style={inputStyle} value={settings.company.currencySymbol} onChange={(e) => updateField('company', 'currencySymbol', e.target.value)} /></Field>
              <Field label="Date Format"><input style={inputStyle} value={settings.company.dateFormat} onChange={(e) => updateField('company', 'dateFormat', e.target.value)} /></Field>
              <Field label="Time Format">
                <select style={inputStyle} value={settings.company.timeFormat} onChange={(e) => updateField('company', 'timeFormat', e.target.value)}>
                  <option value="12h">12-hour</option>
                  <option value="24h">24-hour</option>
                </select>
              </Field>
              <Field label="Financial Year Start"><input style={inputStyle} value={settings.company.financialYearStart} onChange={(e) => updateField('company', 'financialYearStart', e.target.value)} /></Field>
              <Field label="Business Hours Start"><input type="time" style={inputStyle} value={settings.company.businessHoursStart} onChange={(e) => updateField('company', 'businessHoursStart', e.target.value)} /></Field>
              <Field label="Business Hours End"><input type="time" style={inputStyle} value={settings.company.businessHoursEnd} onChange={(e) => updateField('company', 'businessHoursEnd', e.target.value)} /></Field>
            </div>
            <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 80 }} value={settings.company.description} onChange={(e) => updateField('company', 'description', e.target.value)} /></Field>
            <SaveButton section="company" />
          </div>
        )}

        {activeTab === 'theme' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Theme Settings</h3>
            <Field label="Mode">
              <select style={inputStyle} value={settings.theme.mode} onChange={(e) => updateField('theme', 'mode', e.target.value)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Sidebar Color"><input type="color" style={{ ...inputStyle, height: 42 }} value={settings.theme.sidebarColor} onChange={(e) => updateField('theme', 'sidebarColor', e.target.value)} /></Field>
              <Field label="Navbar Color"><input type="color" style={{ ...inputStyle, height: 42 }} value={settings.theme.navbarColor} onChange={(e) => updateField('theme', 'navbarColor', e.target.value)} /></Field>
              <Field label="Primary Color"><input type="color" style={{ ...inputStyle, height: 42 }} value={settings.theme.primaryColor} onChange={(e) => updateField('theme', 'primaryColor', e.target.value)} /></Field>
            </div>
            <Field label="Button Style">
              <select style={inputStyle} value={settings.theme.buttonStyle} onChange={(e) => updateField('theme', 'buttonStyle', e.target.value)}>
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
                <option value="pill">Pill</option>
              </select>
            </Field>
            <Field label="Font Family"><input style={inputStyle} value={settings.theme.fontFamily} onChange={(e) => updateField('theme', 'fontFamily', e.target.value)} /></Field>
            <Field label="Font Size"><input style={inputStyle} value={settings.theme.fontSize} onChange={(e) => updateField('theme', 'fontSize', e.target.value)} /></Field>
            <Field label="Border Radius"><input style={inputStyle} value={settings.theme.borderRadius} onChange={(e) => updateField('theme', 'borderRadius', e.target.value)} /></Field>
            <Field label="Layout Width">
              <select style={inputStyle} value={settings.theme.layoutWidth} onChange={(e) => updateField('theme', 'layoutWidth', e.target.value)}>
                <option value="fluid">Fluid</option>
                <option value="boxed">Boxed</option>
              </select>
            </Field>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Sidebar Collapsed by Default</span>
              <Toggle checked={settings.theme.sidebarCollapsedByDefault} onChange={(v) => updateField('theme', 'sidebarCollapsedByDefault', v)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Sticky Header</span>
              <Toggle checked={settings.theme.stickyHeader} onChange={(v) => updateField('theme', 'stickyHeader', v)} />
            </div>
            <SaveButton section="theme" />
          </div>
        )}

        {activeTab === 'crm' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>CRM Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Lead Number Prefix"><input style={inputStyle} value={settings.crm.leadNumberPrefix} onChange={(e) => updateField('crm', 'leadNumberPrefix', e.target.value)} /></Field>
              <Field label="Customer ID Prefix"><input style={inputStyle} value={settings.crm.customerIdPrefix} onChange={(e) => updateField('crm', 'customerIdPrefix', e.target.value)} /></Field>
              <Field label="Default Lead Status"><input style={inputStyle} value={settings.crm.defaultLeadStatus} onChange={(e) => updateField('crm', 'defaultLeadStatus', e.target.value)} /></Field>
              <Field label="Default Reminder Time (minutes)"><input type="number" style={inputStyle} value={settings.crm.defaultReminderTimeMinutes} onChange={(e) => updateField('crm', 'defaultReminderTimeMinutes', Number(e.target.value))} /></Field>
              <Field label="Default Follow-up Days"><input type="number" style={inputStyle} value={settings.crm.defaultFollowupDays} onChange={(e) => updateField('crm', 'defaultFollowupDays', Number(e.target.value))} /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Auto Generate Lead Number</span>
              <Toggle checked={settings.crm.autoGenerateLeadNumber} onChange={(v) => updateField('crm', 'autoGenerateLeadNumber', v)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Auto Assign Leads</span>
              <Toggle checked={settings.crm.autoAssignLeads} onChange={(v) => updateField('crm', 'autoAssignLeads', v)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Duplicate Lead Detection</span>
              <Toggle checked={settings.crm.duplicateLeadDetection} onChange={(v) => updateField('crm', 'duplicateLeadDetection', v)} />
            </div>

            <Field label="Lead Sources"><ListEditor items={settings.crm.leadSources} onChange={(v) => updateField('crm', 'leadSources', v)} /></Field>
            <Field label="Lead Stages"><ListEditor items={settings.crm.leadStages} onChange={(v) => updateField('crm', 'leadStages', v)} /></Field>
            <Field label="Call Status List"><ListEditor items={settings.crm.callStatusList} onChange={(v) => updateField('crm', 'callStatusList', v)} /></Field>
            <Field label="Budget Ranges"><ListEditor items={settings.crm.budgetRanges} onChange={(v) => updateField('crm', 'budgetRanges', v)} /></Field>
            <Field label="Project Types"><ListEditor items={settings.crm.projectTypes} onChange={(v) => updateField('crm', 'projectTypes', v)} /></Field>
            <SaveButton section="crm" />
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Notification Settings</h3>
            {[
              ['emailNotification', 'Email Notification'],
              ['smsNotification', 'SMS Notification'],
              ['browserNotification', 'Browser Notification'],
              ['reminderNotification', 'Reminder Notification'],
              ['leadAssignmentNotification', 'Lead Assignment Notification'],
              ['passwordChangeNotification', 'Password Change Notification'],
            ].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={labelStyle}>{label}</span>
                <Toggle checked={settings.notifications[key]} onChange={(v) => updateField('notifications', key, v)} />
              </div>
            ))}
            <SaveButton section="notifications" />
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Security Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Password Minimum Length"><input type="number" style={inputStyle} value={settings.security.passwordMinLength} onChange={(e) => updateField('security', 'passwordMinLength', Number(e.target.value))} /></Field>
              <Field label="Password Expiry (days, 0 = never)"><input type="number" style={inputStyle} value={settings.security.passwordExpiryDays} onChange={(e) => updateField('security', 'passwordExpiryDays', Number(e.target.value))} /></Field>
              <Field label="Session Timeout (minutes)"><input type="number" style={inputStyle} value={settings.security.sessionTimeoutMinutes} onChange={(e) => updateField('security', 'sessionTimeoutMinutes', Number(e.target.value))} /></Field>
              <Field label="Max Login Attempts"><input type="number" style={inputStyle} value={settings.security.maxLoginAttempts} onChange={(e) => updateField('security', 'maxLoginAttempts', Number(e.target.value))} /></Field>
              <Field label="Account Lock Duration (minutes)"><input type="number" style={inputStyle} value={settings.security.accountLockDurationMinutes} onChange={(e) => updateField('security', 'accountLockDurationMinutes', Number(e.target.value))} /></Field>
              <Field label="JWT Expiry"><input style={inputStyle} value={settings.security.jwtExpiry} onChange={(e) => updateField('security', 'jwtExpiry', e.target.value)} placeholder="e.g. 1d" /></Field>
              <Field label="Refresh Token Expiry"><input style={inputStyle} value={settings.security.refreshTokenExpiry} onChange={(e) => updateField('security', 'refreshTokenExpiry', e.target.value)} placeholder="e.g. 7d" /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Enable Two-Factor Authentication <em style={{ color: '#94a3b8', fontWeight: 400 }}>(not yet implemented)</em></span>
              <Toggle checked={settings.security.twoFactorEnabled} onChange={(v) => updateField('security', 'twoFactorEnabled', v)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Enable Activity Log</span>
              <Toggle checked={settings.security.activityLogEnabled} onChange={(v) => updateField('security', 'activityLogEnabled', v)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Enable Audit Log</span>
              <Toggle checked={settings.security.auditLogEnabled} onChange={(v) => updateField('security', 'auditLogEnabled', v)} />
            </div>
            <SaveButton section="security" />
          </div>
        )}

        {activeTab === 'email' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Email (SMTP) Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <Field label="SMTP Host"><input style={inputStyle} value={settings.email.smtpHost} onChange={(e) => updateField('email', 'smtpHost', e.target.value)} /></Field>
              <Field label="SMTP Port"><input type="number" style={inputStyle} value={settings.email.smtpPort} onChange={(e) => updateField('email', 'smtpPort', Number(e.target.value))} /></Field>
            </div>
            <Field label="SMTP Username"><input style={inputStyle} value={settings.email.smtpUsername} onChange={(e) => updateField('email', 'smtpUsername', e.target.value)} /></Field>
            <Field label="SMTP Password"><input type="password" style={inputStyle} placeholder="Leave blank to keep current password" onChange={(e) => updateField('email', 'smtpPassword', e.target.value)} /></Field>
            <Field label="Encryption Type">
              <select style={inputStyle} value={settings.email.encryptionType} onChange={(e) => updateField('email', 'encryptionType', e.target.value)}>
                <option value="none">None</option>
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
              </select>
            </Field>
            <Field label="Sender Name"><input style={inputStyle} value={settings.email.senderName} onChange={(e) => updateField('email', 'senderName', e.target.value)} /></Field>
            <Field label="Sender Email"><input style={inputStyle} value={settings.email.senderEmail} onChange={(e) => updateField('email', 'senderEmail', e.target.value)} /></Field>
            <SaveButton section="email" />

            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
              <Field label="Send Test Email To">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input style={inputStyle} value={testEmailAddr} onChange={(e) => setTestEmailAddr(e.target.value)} placeholder="you@example.com" />
                  <button onClick={handleTestEmail} style={{ padding: '0 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Send Test</button>
                </div>
              </Field>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>System Settings</h3>
            <Field label="Application Name"><input style={inputStyle} value={settings.system.applicationName} onChange={(e) => updateField('system', 'applicationName', e.target.value)} /></Field>
            <Field label="Application Version"><input style={inputStyle} value={settings.system.applicationVersion} disabled /></Field>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Maintenance Mode</span>
              <Toggle checked={settings.system.maintenanceMode} onChange={(v) => updateField('system', 'maintenanceMode', v)} />
            </div>
            <Field label="Maintenance Message"><textarea style={{ ...inputStyle, minHeight: 70 }} value={settings.system.maintenanceMessage} onChange={(e) => updateField('system', 'maintenanceMessage', e.target.value)} /></Field>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Enable Forgot Password</span>
              <Toggle checked={settings.system.enableForgotPassword} onChange={(v) => updateField('system', 'enableForgotPassword', v)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Enable Email Verification</span>
              <Toggle checked={settings.system.enableEmailVerification} onChange={(v) => updateField('system', 'enableEmailVerification', v)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Enable Mobile Verification</span>
              <Toggle checked={settings.system.enableMobileVerification} onChange={(v) => updateField('system', 'enableMobileVerification', v)} />
            </div>
            <SaveButton section="system" />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Dashboard Settings</h3>
            <Field label="Dashboard Refresh Time (seconds, 0 = manual)">
              <input type="number" style={inputStyle} value={settings.dashboard.refreshTimeSeconds} onChange={(e) => updateField('dashboard', 'refreshTimeSeconds', Number(e.target.value))} />
            </Field>
            <Field label="Default Dashboard"><input style={inputStyle} value={settings.dashboard.defaultDashboard} onChange={(e) => updateField('dashboard', 'defaultDashboard', e.target.value)} /></Field>
            <Field label="Visible Dashboard Cards"><ListEditor items={settings.dashboard.visibleCards} onChange={(v) => updateField('dashboard', 'visibleCards', v)} /></Field>
            <Field label="Visible Charts"><ListEditor items={settings.dashboard.visibleCharts} onChange={(v) => updateField('dashboard', 'visibleCharts', v)} /></Field>
            <SaveButton section="dashboard" />
          </div>
        )}

        {activeTab === 'fileUpload' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>File Upload Settings</h3>
            <Field label="Maximum Upload Size (MB)"><input type="number" style={inputStyle} value={settings.fileUpload.maxUploadSizeMB} onChange={(e) => updateField('fileUpload', 'maxUploadSizeMB', Number(e.target.value))} /></Field>
            <Field label="Allowed Image Extensions"><ListEditor items={settings.fileUpload.allowedImageExtensions} onChange={(v) => updateField('fileUpload', 'allowedImageExtensions', v)} /></Field>
            <Field label="Allowed Document Extensions"><ListEditor items={settings.fileUpload.allowedDocumentExtensions} onChange={(v) => updateField('fileUpload', 'allowedDocumentExtensions', v)} /></Field>
            <Field label="Allowed Excel Extensions"><ListEditor items={settings.fileUpload.allowedExcelExtensions} onChange={(v) => updateField('fileUpload', 'allowedExcelExtensions', v)} /></Field>
            <SaveButton section="fileUpload" />
          </div>
        )}

        {activeTab === 'backup' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Backup Settings</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Enable Auto Backup</span>
              <Toggle checked={settings.backup.autoBackupEnabled} onChange={(v) => updateField('backup', 'autoBackupEnabled', v)} />
            </div>
            <Field label="Backup Schedule">
              <select style={inputStyle} value={settings.backup.backupSchedule} onChange={(e) => updateField('backup', 'backupSchedule', e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Last backup: {settings.backup.lastBackupAt ? new Date(settings.backup.lastBackupAt).toLocaleString() : 'Never'}
            </p>
            <SaveButton section="backup" />
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
              <button onClick={() => handleBackupAction('backup')} style={{ padding: '10px 18px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Manual Backup Now</button>
              <button onClick={() => handleBackupAction('restore')} style={{ padding: '10px 18px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Restore from Backup</button>
            </div>
          </div>
        )}

        {activeTab === 'activityLog' && (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Activity Log Settings</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={labelStyle}>Enable Activity Logs</span>
              <Toggle checked={settings.activityLog.enabled} onChange={(v) => updateField('activityLog', 'enabled', v)} />
            </div>
            <Field label="Log Retention Period (days)"><input type="number" style={inputStyle} value={settings.activityLog.retentionDays} onChange={(e) => updateField('activityLog', 'retentionDays', Number(e.target.value))} /></Field>
            <SaveButton section="activityLog" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;