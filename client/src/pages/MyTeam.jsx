import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaComments,
  FaSearch,
  FaUsers,
  FaCrown,
  FaPhoneAlt,
  FaEnvelope,
  FaUserCheck,
  FaShieldAlt,
  FaHeadset,
  FaBriefcase
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import teamService from '../services/teamService';

const formatRoleBadge = (role) => {
  switch (role) {
    case 'manager':
      return { label: 'Manager / Lead', bg: '#f3e8ff', color: '#7e22ce', border: '#d8b4fe', icon: FaCrown };
    case 'telecaller':
      return { label: 'Telecaller', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe', icon: FaHeadset };
    case 'sales executer':
    case 'sales executive':
      return { label: 'Sales Executive', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', icon: FaBriefcase };
    case 'admin':
      return { label: 'Admin', bg: '#fee2e2', color: '#b91c1c', border: '#fecaca', icon: FaShieldAlt };
    default:
      return { label: role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: FaUserCheck };
  }
};

const getInitials = (name) => {
  if (!name) return 'TM';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('') || 'TM';
};

const MyTeam = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchMyTeams = () => {
    setLoading(true);
    teamService.getTeams()
      .then((res) => {
        const availableTeams = res.data.data || [];
        const currentUserId = String(user?._id || user?.id || '');
        const userTeamIds = new Set((user?.teamIds || []).map((id) => String(id?._id || id)));

        // Backend already handles team permission. Show teams where user is linked or lead, or fallback to all available teams
        const visibleTeams = (user?.role === 'admin' || user?.role === 'manager' || userTeamIds.size === 0)
          ? availableTeams
          : availableTeams.filter(
              (team) =>
                userTeamIds.has(String(team._id)) ||
                String(team.teamLead?._id || team.teamLead) === currentUserId ||
                (team.members || []).some((m) => String(m._id || m) === currentUserId)
            );

        setTeams(visibleTeams.length > 0 ? visibleTeams : availableTeams);
      })
      .catch(() => toast.error('Unable to load your teams'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMyTeams();
  }, [user]);

  const availableDepartments = useMemo(
    () => ['all', ...new Set(teams.map((team) => team.department).filter(Boolean))],
    [teams]
  );

  const totalMembersCount = useMemo(() => {
    const memberIds = new Set();
    teams.forEach((t) => {
      (t.members || []).forEach((m) => memberIds.add(String(m._id || m)));
    });
    if (user?._id || user?.id) {
      memberIds.add(String(user?._id || user?.id));
    }
    return memberIds.size;
  }, [teams, user]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teams.filter((team) => {
      const teamText = `${team.name} ${team.code || ''} ${team.department || ''} ${team.teamLead?.name || ''}`.toLowerCase();
      const matchesSearch =
        !query ||
        teamText.includes(query) ||
        (team.members || []).some((m) =>
          `${m.name || ''} ${m.email || ''} ${m.phone || ''} ${m.role || ''}`.toLowerCase().includes(query)
        );
      const matchesDepartment = departmentFilter === 'all' || team.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [teams, search, departmentFilter]);

  return (
    <div style={{ padding: '24px 32px', background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '100vh' }}>
      {/* Top Header Card */}
      <div style={{
        marginBottom: '24px',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)',
            color: '#ffffff'
          }}>
            <FaUsers size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#0f172a', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              My Team & Collaboration
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '14px' }}>
              View respective team members, check active roles, and collaborate internally through dedicated team chat.
            </p>
          </div>
        </div>

        {/* Stats Badges */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            padding: '10px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '100px'
          }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Teams</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{teams.length}</span>
          </div>

          <div style={{
            padding: '10px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '100px'
          }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Members</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>{totalMembersCount}</span>
          </div>

          <div style={{
            padding: '10px 16px',
            background: '#ecfdf5',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: '100px'
          }}>
            <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>Chat Status</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>● Live</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {!loading && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '22px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            minWidth: '260px',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '10px 16px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
          }}>
            <FaSearch style={{ color: '#94a3b8', marginRight: '10px' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team name, code, lead, or member name..."
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', background: 'transparent', color: '#0f172a' }}
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              minWidth: '180px',
              color: '#0f172a',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              cursor: 'pointer'
            }}
          >
            {availableDepartments.map((department) => (
              <option key={department} value={department}>
                {department === 'all' ? 'All Departments' : department}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Teams Grid */}
      {loading ? (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: '#64748b',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>Loading team workspaces...</div>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div style={{
          background: '#ffffff',
          padding: '40px 24px',
          borderRadius: '16px',
          color: '#64748b',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0'
        }}>
          <FaUsers size={32} color="#cbd5e1" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px', color: '#334155' }}>No Connected Teams Found</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            No teams match your search or filter. Once you are added to a team, your team workspace will appear here.
          </p>
          <button
            onClick={fetchMyTeams}
            style={{
              marginTop: '16px',
              padding: '8px 18px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Refresh Teams
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px' }}>
          {filteredTeams.map((team) => {
            const membersList = team.members || [];
            return (
              <div
                key={team._id}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  boxShadow: '0 4px 18px rgba(15, 23, 42, 0.06)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Team Card Header */}
                <div style={{
                  padding: '20px 22px',
                  borderBottom: '1px solid #f1f5f9',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 800 }}>
                        {team.name}
                      </h2>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.04em'
                        }}>
                          {team.code || 'TEAM'}
                        </span>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          {team.department || 'Operations'}
                        </span>
                      </div>
                    </div>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: '#ecfdf5',
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                      Active
                    </span>
                  </div>

                  {/* Team Lead Info */}
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#fef08a',
                      color: '#854d0e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}>
                      <FaCrown />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                        Team Lead / Manager
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {team.teamLead?.name || 'Unassigned Lead'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Respective Team Members Section */}
                <div style={{ padding: '18px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaUsers size={14} color="#6366f1" />
                      Respective Team Members ({membersList.length})
                    </div>
                  </div>

                  {membersList.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '13px',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1'
                    }}>
                      No members assigned to this team yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                      {membersList.map((member) => {
                        const badge = formatRoleBadge(member.role);
                        const isOnline = member.isActive !== false;
                        return (
                          <div
                            key={member._id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '12px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              {/* Avatar */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '12px',
                                flexShrink: 0
                              }}>
                                {getInitials(member.name)}
                              </div>

                              {/* Details */}
                              <div style={{ minWidth: 0 }}>
                                <div style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {member.name}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', color: '#64748b', fontSize: '11px' }}>
                                  {member.phone && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <FaPhoneAlt size={9} /> {member.phone}
                                    </span>
                                  )}
                                  {member.email && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      <FaEnvelope size={9} /> {member.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Role Badge */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                                fontSize: '11px',
                                fontWeight: 600
                              }}>
                                <badge.icon size={10} />
                                {badge.label}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px', fontSize: '10px', color: isOnline ? '#16a34a' : '#94a3b8' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isOnline ? '#22c55e' : '#cbd5e1' }} />
                                {isOnline ? 'Active' : 'Offline'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Team Card Footer Action */}
                <div style={{
                  padding: '16px 22px',
                  borderTop: '1px solid #f1f5f9',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                    Internal workspace chat
                  </span>
                  <Link
                    to={`/my-team/${team._id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <FaComments size={14} /> Open Team Chat
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyTeam;