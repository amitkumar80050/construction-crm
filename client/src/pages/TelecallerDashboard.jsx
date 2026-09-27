import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaPlus } from 'react-icons/fa';
import leadService from '../services/leadService';
import LeadList from '../components/leads/LeadList';
import LeadForm from '../components/leads/LeadForm';
import LeadImport from '../components/leads/LeadImport';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import LeadCard from '../components/leads/LeadCard';
import LeadStageModal from '../components/leads/LeadStageModal';


const TelecallerDashboard = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [leadDetail, setLeadDetail] = useState(null);
  

  const load = async () => {
    setLoading(true);
    try { setLeads((await leadService.getMyLeads()).data?.data || []); }
    catch (error) { toast.error('Unable to load your leads'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openLead = async (lead) => {
    try { setLeadDetail((await leadService.getLead(lead._id)).data?.data); }
    catch (error) { toast.error('Unable to load lead details'); }
  };

  const refreshDetail = async () => {
    if (leadDetail) setLeadDetail((await leadService.getLead(leadDetail.lead._id)).data?.data);
    load();
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: '#1e293b', margin: 0 }}>Telecaller Dashboard</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Work your assigned leads and log every call.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <LeadImport onImported={load} />
          <button onClick={() => setShowAddForm(true)} style={{ padding: '10px 18px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaPlus /> Add Lead
          </button>
        </div>
      </div>

      {loading ? <p>Loading...</p> : <LeadList leads={leads} onOpen={openLead} />}

      {showAddForm && <LeadForm onClose={() => setShowAddForm(false)} onCreated={load} />}
      {leadDetail && <LeadDetailModal leadDetail={leadDetail} onClose={() => setLeadDetail(null)} onUpdated={refreshDetail} />}
    </div>
  );
};
export default TelecallerDashboard;