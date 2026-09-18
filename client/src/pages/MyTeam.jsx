import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaComments, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import teamService from '../services/teamService';

const MyTeam = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    teamService.getTeams()
      .then((res) => {
        if (!active) return;
        const availableTeams = res.data.data || [];
        if (user?.role === 'admin') {
          setTeams(availableTeams);
          return;
        }
        const memberTeamIds = new Set((user?.teamIds || []).map((id) => String(id?._id || id)));
        setTeams(availableTeams.filter((team) => memberTeamIds.has(String(team._id))));
      })
      .catch(() => toast.error('Unable to load your teams'))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, [user]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaUsers size={24} color="#2563eb" />
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: '28px' }}>My Team</h1>
        </div>
        <p style={{ color: '#64748b', margin: '8px 0 0' }}>Open a team workspace and collaborate with its members.</p>
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Loading teams...</p> : teams.length === 0 ? (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', color: '#64748b' }}>
          You are not assigned to a team yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {teams.map((team) => (
            <div key={team._id} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '20px' }}>{team.name}</h2>
              <p style={{ margin: '0 0 4px', color: '#64748b' }}>{team.department || 'Team workspace'}</p>
              <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '13px' }}>{team.memberCount || 0} members</p>
              <Link to={`/my-team/${team._id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#2563eb', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
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