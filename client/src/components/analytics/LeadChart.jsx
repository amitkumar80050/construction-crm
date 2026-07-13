import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import analyticsService from '../../services/analyticsService';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LeadChart = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await analyticsService.getDashboardAnalytics();
        setData(res.data?.data || null);
      } catch (error) {
        toast.error('Failed to load lead analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading lead data...</p>;
  }

  if (!data) {
    return <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No lead data available.</p>;
  }

  const { clientStats, stageDistribution, monthlyNewClients } = data;

  const statusChartData = {
    labels: ['Leads', 'Active', 'Closed', 'Lost'],
    datasets: [
      {
        data: [clientStats.leads, clientStats.active, clientStats.closed, clientStats.lost],
        backgroundColor: ['#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'],
        borderWidth: 2,
      },
    ],
  };

  const monthlyLabels = (monthlyNewClients || []).map(
    (m) => `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`
  );
  const monthlyChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'New Leads',
        data: (monthlyNewClients || []).map((m) => m.count),
        backgroundColor: 'rgba(37, 99, 235, 0.5)',
        borderColor: '#2563eb',
        borderWidth: 2,
      },
    ],
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Lead Status Breakdown</h3>
        <div style={{ height: '280px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '260px' }}>
            <Doughnut
              data={statusChartData}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>New Leads (Last 6 Months)</h3>
        <div style={{ height: '280px' }}>
          {monthlyLabels.length > 0 ? (
            <Bar
              data={monthlyChartData}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }}
            />
          ) : (
            <p style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '100px' }}>No monthly data yet.</p>
          )}
        </div>
      </div>

      {stageDistribution && stageDistribution.length > 0 && (
        <div style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', gridColumn: '1 / -1'
        }}>
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Stage Distribution</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {stageDistribution.map((s, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 16px', background: '#f8fafc', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', gap: '10px', minWidth: '140px'
                }}
              >
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{s.stageName || 'Unassigned'}</span>
                <span style={{
                  marginLeft: 'auto', padding: '2px 10px', borderRadius: '20px',
                  fontSize: '12px', background: '#dbeafe', color: '#2563eb', fontWeight: 600
                }}>
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadChart;