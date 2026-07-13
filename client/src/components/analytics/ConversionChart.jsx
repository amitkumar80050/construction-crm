import React, { useEffect, useState } from 'react';
import { FaPercent, FaUsers, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import analyticsService from '../../services/analyticsService';

const ConversionChart = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await analyticsService.getDashboardAnalytics();
        setStats(res.data?.data?.clientStats || null);
      } catch (error) {
        toast.error('Failed to load conversion data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading conversion data...</p>;
  }

  if (!stats) {
    return <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No conversion data available.</p>;
  }

  const cards = [
    { label: 'Total Leads', value: stats.total, icon: FaUsers, color: '#2563eb' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: FaPercent, color: '#22c55e' },
    { label: 'Closed Won', value: stats.closed, icon: FaCheckCircle, color: '#8b5cf6' },
    { label: 'Lost', value: stats.lost, icon: FaTimesCircle, color: '#ef4444' },
  ];

  const conversionPct = Math.min(100, parseFloat(stats.conversionRate) || 0);

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Conversion Overview</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {cards.map((c) => (
          <div key={c.label} style={{ padding: '14px', background: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px', background: `${c.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color
            }}>
              <c.icon size={16} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{c.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Simple progress bar for conversion rate */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
          <span>Conversion Progress</span>
          <span>{conversionPct}%</span>
        </div>
        <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '20px', overflow: 'hidden' }}>
          <div style={{
            width: `${conversionPct}%`, height: '100%', background: '#22c55e',
            borderRadius: '20px', transition: 'width 0.4s ease'
          }} />
        </div>
      </div>
    </div>
  );
};

export default ConversionChart;