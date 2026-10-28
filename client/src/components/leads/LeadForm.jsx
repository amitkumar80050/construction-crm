import React, { useState, useEffect } from 'react';
import { FaSave, FaTimes, FaBuilding, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaUsers, FaRupeeSign, FaTag } from 'react-icons/fa';
import teamService from '../../services/teamService';
import { useAuth } from '../../hooks/useAuth';

const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  source: 'website',
  status: 'lead',
  pipelineStage: 'NEW',
  projectValue: '',
  notes: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  teamId: '',
  assignedTo: ''
};

const LeadForm = ({
  initialData,
  onSubmit,
  onCancel,
  saving,
  submitLabel = 'Save Lead',
  teams: externalTeams,
  defaultTeamId = ''
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(emptyForm);
  const [teams, setTeams] = useState(externalTeams || []);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Load teams if not provided externally
  useEffect(() => {
    if (externalTeams && externalTeams.length > 0) {
      setTeams(externalTeams);
      if (!formData.teamId) {
        setFormData((prev) => ({ ...prev, teamId: defaultTeamId || externalTeams[0]?._id || '' }));
      }
      return;
    }

    teamService.getTeams().then((res) => {
      const list = res.data?.data || [];
      const userTeamIds = new Set((user?.teamIds || []).map((id) => String(id?._id || id)));
      const visibleTeams = user?.role === 'admin'
        ? list
        : list.filter((t) => userTeamIds.has(String(t._id)) || String(t.teamLead?._id || t.teamLead) === String(user?._id || user?.id));
      setTeams(visibleTeams);
      if (visibleTeams.length > 0 && !formData.teamId) {
        setFormData((prev) => ({ ...prev, teamId: defaultTeamId || visibleTeams[0]._id }));
      }
    }).catch(() => {});
  }, [externalTeams, user, defaultTeamId]);

  // Load team members when teamId changes
  useEffect(() => {
    if (!formData.teamId) {
      setTeamMembers([]);
      return;
    }
    setLoadingMembers(true);
    teamService.getTeam(formData.teamId).then((res) => {
      const teamData = res.data?.data || {};
      const allMembers = teamData.members || [];
      // Filter to active members belonging to this respective team, prioritizing telecallers and sales executives
      const assignable = allMembers
        .filter((m) => m.isActive !== false && ['telecaller', 'sales executer', 'sales executive', 'manager', 'user'].includes(m.role))
        .sort((a, b) => {
          const priority = { telecaller: 1, 'sales executer': 2, 'sales executive': 2, manager: 3, user: 4 };
          return (priority[a.role] || 99) - (priority[b.role] || 99);
        });
      setTeamMembers(assignable);

      // If current assignedTo does not exist in this team, reset it
      if (formData.assignedTo && !assignable.some((m) => String(m._id) === String(formData.assignedTo))) {
        setFormData((prev) => ({ ...prev, assignedTo: '' }));
      }
    }).catch(() => {
      setTeamMembers([]);
    }).finally(() => {
      setLoadingMembers(false);
    });
  }, [formData.teamId]);

  // Sync initialData
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || '',
        company: initialData.company || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        source: initialData.source || 'website',
        status: initialData.status || 'lead',
        pipelineStage: initialData.pipelineStage || 'NEW',
        projectValue: initialData.projectValue ?? '',
        notes: initialData.notes || '',
        address: initialData.address?.street || initialData.address || '',
        city: initialData.address?.city || '',
        state: initialData.address?.state || '',
        zipCode: initialData.address?.zipCode || '',
        teamId: initialData.team?._id || initialData.team || prev.teamId || '',
        assignedTo: initialData.assignedTo?._id || initialData.assignedTo || prev.assignedTo || ''
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'teamId') {
      setFormData((prev) => ({
        ...prev,
        teamId: value,
        assignedTo: '' // Reset assignedTo when team changes so member belongs to the selected team
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    if (!name) {
      alert('Lead Name is required.');
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!phoneDigits && !formData.email.trim()) {
      alert('Please provide a valid Phone Number or Email Address.');
      return;
    }

    if (phoneDigits && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      alert('Phone Number must contain between 7 and 15 digits.');
      return;
    }

    if (!formData.teamId && teams.length > 0) {
      alert('Please select a Team for this lead.');
      return;
    }

    const payload = {
      name,
      company: formData.company.trim() || name,
      email: formData.email.trim().toLowerCase(),
      phone: phoneDigits,
      source: formData.source,
      status: formData.status,
      pipelineStage: formData.pipelineStage,
      projectValue: Number(formData.projectValue) || 0,
      notes: formData.notes.trim(),
      teamId: formData.teamId || undefined,
      assignedTo: formData.assignedTo || undefined,
      address: {
        street: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim()
      }
    };

    onSubmit(payload);
  };

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    padding: '20px 22px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
  };

  const sectionHeadingStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '0 0 16px 0',
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '10px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#f8fafc',
    transition: 'all 0.2s ease',
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* SECTION 1: PRIMARY LEAD INFORMATION */}
      <div style={cardStyle}>
        <div style={sectionHeadingStyle}>
          <FaBuilding color="#2563eb" size={15} /> Primary Lead Information
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              Lead / Client Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Ramesh Kulkarni"
              value={formData.name}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Company / Organization</label>
            <input
              type="text"
              name="company"
              placeholder="e.g. Apex Healthcare Infra"
              value={formData.company}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Lead Source <span style={{ color: '#ef4444' }}>*</span></label>
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              required
              style={inputStyle}
            >
              <option value="website">🌐 Website</option>
              <option value="referral">🤝 Referral</option>
              <option value="social_media">📱 Social Media</option>
              <option value="call">📞 Direct Call</option>
              <option value="email">✉️ Email Campaign</option>
              <option value="other">📌 Other</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Initial Pipeline Stage</label>
            <select
              name="pipelineStage"
              value={formData.pipelineStage}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="NEW">✨ NEW</option>
              <option value="CONNECTED">📞 CONNECTED</option>
              <option value="INTERESTED">⭐ INTERESTED</option>
              <option value="FOLLOW_UP">⏳ FOLLOW UP</option>
              <option value="SITE_VISIT_PLANNED">📅 SITE VISIT PLANNED</option>
              <option value="SITE_VISIT_DONE">✅ SITE VISIT DONE</option>
              <option value="QUOTATION">📄 QUOTATION</option>
              <option value="CONVERTED">🎉 CONVERTED</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: CONTACT INFORMATION */}
      <div style={cardStyle}>
        <div style={sectionHeadingStyle}>
          <FaPhone color="#059669" size={14} /> Contact Information
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              Phone Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                background: '#e2e8f0',
                border: '1px solid #cbd5e1',
                borderRight: 'none',
                borderRadius: '8px 0 0 8px',
                padding: '10px 12px',
                fontSize: '13px',
                color: '#475569',
                fontWeight: 600
              }}>
                +91
              </span>
              <input
                type="tel"
                name="phone"
                required
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={handleChange}
                style={{ ...inputStyle, borderRadius: '0 8px 8px 0' }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="e.g. client@company.com"
              value={formData.email}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: TEAM & ASSIGNMENT */}
      <div style={cardStyle}>
        <div style={sectionHeadingStyle}>
          <FaUsers color="#6366f1" size={15} /> Team & Assignment
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              Assign to Team <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              name="teamId"
              required
              value={formData.teamId}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">-- Choose Team --</option>
              {teams.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.code || 'TEAM'})
                </option>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '4px' }}>
              Select team to filter eligible executives and telecallers
            </span>
          </div>

          <div>
            <label style={labelStyle}>Assigned Executive / Telecaller</label>
            <select
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              style={{
                ...inputStyle,
                background: !formData.teamId ? '#f8fafc' : '#ffffff',
                borderColor: !formData.teamId ? '#cbd5e1' : '#cbd5e1'
              }}
              disabled={!formData.teamId || loadingMembers}
            >
              {!formData.teamId ? (
                <option value="">-- Select Team First --</option>
              ) : (
                <>
                  <option value="">-- Unassigned (Available in Pool) --</option>
                  {teamMembers.map((m) => {
                    const roleLabel =
                      m.role === 'sales executer' || m.role === 'sales executive'
                        ? 'Sales Executive'
                        : m.role === 'telecaller'
                        ? 'Telecaller'
                        : m.role === 'manager'
                        ? 'Manager / Lead'
                        : m.role;
                    return (
                      <option key={m._id} value={m._id}>
                        {m.name} ({roleLabel})
                      </option>
                    );
                  })}
                </>
              )}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              {loadingMembers ? (
                <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 500 }}>
                  ⏳ Loading respective team members...
                </span>
              ) : !formData.teamId ? (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Please select a team to see assignable members.
                </span>
              ) : teamMembers.length > 0 ? (
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>
                  ✓ {teamMembers.length} member(s) available in this team
                </span>
              ) : (
                <span style={{ fontSize: '11px', color: '#ea580c', fontWeight: 500 }}>
                  ⚠️ No telecallers or sales executives assigned to this team
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: PROJECT & PROPERTY SCOPE */}
      <div style={cardStyle}>
        <div style={sectionHeadingStyle}>
          <FaRupeeSign color="#d97706" size={14} /> Project Scope & Property Location
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Estimated Project Value (₹)</label>
            <input
              type="number"
              name="projectValue"
              min="0"
              step="10000"
              placeholder="e.g. 5000000"
              value={formData.projectValue}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>City</label>
            <input
              type="text"
              name="city"
              placeholder="e.g. Lucknow"
              value={formData.city}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>State / Region</label>
            <input
              type="text"
              name="state"
              placeholder="e.g. Uttar Pradesh"
              value={formData.state}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Postal / PIN Code</label>
            <input
              type="text"
              name="zipCode"
              placeholder="e.g. 226001"
              value={formData.zipCode}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Project Site / Street Address</label>
          <input
            type="text"
            name="address"
            placeholder="Plot / Street / Landmark"
            value={formData.address}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>
      </div>

      {/* SECTION 5: NOTES & CLIENT REQUIREMENTS */}
      <div style={cardStyle}>
        <div style={sectionHeadingStyle}>
          <FaTag color="#8b5cf6" size={14} /> Requirements & Client Notes
        </div>
        <textarea
          name="notes"
          rows="4"
          placeholder="Record initial client requirements, floor plan inquiries, project timeline, or specific preferences..."
          value={formData.notes}
          onChange={handleChange}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '90px' }}
        />
      </div>

      {/* FORM ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '11px 22px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#475569',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaTimes size={13} /> Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '11px 28px',
            background: saving ? '#93c5fd' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}
        >
          <FaSave size={14} /> {saving ? 'Saving Lead...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default LeadForm;