import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaComments, FaSearch, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import teamService from '../services/teamService';

const MyTeam = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    teamService.getTeams()
      .then((res) => {
        if (!active) return;
        const availableTeams = res.data.data || [];
        const userTeamIds = new Set((user?.teamIds || []).map((id) => String(id?._id || id)));

        const visibleTeams = user?.role === 'admin' ? availableTeams : availableTeams.filter((team) => userTeamIds.has(String(team._id)));
        setTeams(visibleTeams);
      })
      .catch(() => toast.error('Unable to load your teams'))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [user]);

  const availableDepartments = useMemo(
    () => ['all', ...new Set(teams.map((team) => team.department).filter(Boolean))],
    [teams]
  );

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teams.filter((team) => {
      const text = `${team.name} ${team.code || ''} ${team.teamLead?.name || ''}`.toLowerCase();
      const matchesSearch = !query || text.includes(query);
      const matchesDepartment = departmentFilter === 'all' || team.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [teams, search, departmentFilter]);

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px', background: 'white', borderRadius: '18px', padding: '22px 24px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' }}>
            <FaUsers size={20} color="#1d4ed8" />
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#1e293b', fontSize: '28px' }}>My Team</h1>
            <p style={{ color: '#64748b', margin: '6px 0 0' }}>Open a team workspace and collaborate with members in your connected teams.</p>
          </div>
        </div>
      </div>

      {!loading && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px', background: 'white', borderRadius: '12px', padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <FaSearch style={{ color: '#64748b', marginRight: '8px' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team name, code, or lead..."
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', background: 'transparent' }}
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', minWidth: '180px', color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            {availableDepartments.map((department) => (
              <option key={department} value={department}>
                {department === 'all' ? 'All departments' : department}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? <p style={{ color: '#64748b' }}>Loading teams...</p> : filteredTeams.length === 0 ? (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          No connected teams match your search or filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {filteredTeams.map((team) => (
            <div key={team._id} style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)', padding: '20px', borderRadius: '16px', boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '20px' }}>{team.name}</h2>
                <span style={{ padding: '5px 10px', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>
                  {team.code || 'TEAM'}
                </span>
              </div>

              <div style={{ margin: '0 0 10px', color: '#64748b', fontSize: '14px' }}>{team.department || 'Team workspace'}</div>
              <div style={{ margin: '0 0 10px', color: '#475569', fontSize: '13px' }}>
                Lead: <strong style={{ color: '#1e293b' }}>{team.teamLead?.name || 'Unassigned'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', color: '#64748b', fontSize: '13px' }}>
                <span>{team.memberCount || 0} members</span>
                <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#ecfdf5', color: '#15803d' }}>Active</span>
              </div>

              <Link to={`/my-team/${team._id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, boxShadow: '0 8px 16px rgba(37, 99, 235, 0.25)' }}>
                <FaComments /> Open chat
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTeam;