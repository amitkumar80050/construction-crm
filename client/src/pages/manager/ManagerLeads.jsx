import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import leadService from '../../services/leadService';
import teamService from '../../services/teamService';
import LeadList from '../../components/leads/LeadList';
import LeadDetailModal from '../../components/leads/LeadDetailModal';

const ManagerLeads = () => {
  const [leads, setLeads] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [leadDetail, setLeadDetail] = useState(null);
  const [assigningLead, setAssigningLead] = useState(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [leadsRes, teamsRes, membersRes] = await Promise.all([
        leadService.getMyLeads(),
        teamService.getTeams(),
        leadService.getTeamMembers(),
      ]);
      setLeads(leadsRes.data?.data || []);
      setTeams(teamsRes.data?.data || []);
      setMembers((membersRes.data?.data || []).filter((member) => ['telecaller', 'sales executer'].includes(member.role)));
      setSelectedTeamId((current) => current || teamsRes.data?.data?.[0]?._id || '');
    } catch (error) { toast.error('Unable to load team leads'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openLead = async (lead) => {
    setLeadDetail((await leadService.getLead(lead._id)).data?.data);
  };

  const reassign = (lead) => {
    setAssigningLead(lead);
    setAssigneeId(lead.assignedTo?._id || '');
  };

  const confirmReassign = async () => {
    if (!assigneeId) return toast.error('Select a team member.');
    setSavingAssignment(true);
    try {
      await leadService.reassign(assigningLead._id, assigneeId);
      toast.success('Lead reassigned');
      setAssigningLead(null);
      await load();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to reassign'); }
    finally { setSavingAssignment(false); }
  };

  const distribute = async () => {
    if (!selectedTeamId) return toast.error('Select a team first.');
    try {
      const res = await leadService.distribute(selectedTeamId);
      toast.success(`Distributed ${res.data.distributed} leads`);
      load();
    } catch (error) { toast.error(error.response?.data?.message || 'Unable to distribute'); }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', color: '#1e293b' }}>Team Leads</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select aria-label="Distribution team" value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 6 }}>
            <option value="">Select team</option>
            {teams.map((team) => <option key={team._id} value={team._id}>{team.name}</option>)}
          </select>
          <button onClick={distribute} disabled={!teams.length} style={{ padding: '10px 18px', background: '#176b55', color: 'white', border: 'none', borderRadius: '6px', cursor: teams.length ? 'pointer' : 'not-allowed' }}>
            Distribute Unassigned Leads
          </button>
        </div>
      </div>
      {loading ? <p>Loading...</p> : <LeadList leads={leads} onOpen={openLead} onReassign={reassign} showAssignee />}
      {leadDetail && <LeadDetailModal leadDetail={leadDetail} onClose={() => setLeadDetail(null)} onUpdated={load} />}
      {assigningLead && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'grid', placeItems: 'center', zIndex: 1000 }}>
        <form onSubmit={(event) => { event.preventDefault(); confirmReassign(); }} style={{ width: 'min(400px, 92vw)', background: 'white', padding: 24, borderRadius: 8 }}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>Reassign {assigningLead.name}</h2>
          <label htmlFor="lead-assignee">Team member</label>
          <select id="lead-assignee" required value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} style={{ width: '100%', padding: 10, margin: '8px 0 18px', border: '1px solid #cbd5e1', borderRadius: 4 }}>
            <option value="">Choose a team member</option>
            {members.filter((member) => {
              const onLeadTeam = (member.teamIds || []).some((id) => String(id?._id || id) === String(assigningLead.team?._id || assigningLead.team)) || !assigningLead.team;
              const stageAllowsAssignment = member.role !== 'sales executer' || assigningLead.pipelineStage === 'SITE_VISIT_PLANNED';
              return onLeadTeam && stageAllowsAssignment;
            }).map((member) => (
              <option key={member._id} value={member._id}>{member.name} · {member.role}</option>
            ))}
          </select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={() => setAssigningLead(null)}>Cancel</button>
            <button type="submit" disabled={savingAssignment}>{savingAssignment ? 'Saving...' : 'Save assignment'}</button>
          </div>
        </form>
      </div>}
    </div>
  );
};
export default ManagerLeads;