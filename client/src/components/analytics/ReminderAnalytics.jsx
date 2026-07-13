import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import { FaBell, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import analyticsService from '../../services/analyticsService';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, PointElement, LineElement);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PRIORITY_COLORS = { low: '#64748b', medium: '#f59e0b', high: '#ef4444' };

const ReminderAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await analyticsService.getReminderAnalytics();
        setData(res.data?.data || null);
      } catch (error) {
        toast.error('Failed to load reminder analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Loading reminder analytics...</p>;
  }

  if (!data) {
    return <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>No reminder data available.</p>;
  }

  const { total, completed, pending, overdue, completionRate, priorityDistribution, monthlyTrend } = data;

  const cards = [
    { label: 'Total Reminders', value: total, icon: FaBell, color: '#2563eb' },
    { label: 'Completed', value: completed, icon: FaCheckCircle, color: '#22c55e' },
    { label: 'Pending', value: pending, icon: FaClock, color: '#f59e0b' },
    { label: 'Overdue', value: overdue, icon: FaExclamationTriangle, color: '#ef4444' },
  ];

  const priorityChartData = {
    labels: (priorityDistribution || []).map((p) => p._id?.charAt(0).toUpperCase() + p._id?.slice(1)),
    datasets: [
      {
        data: (priorityDistribution || []).map((p) => p.count),
        backgroundColor: (priorityDistribution || []).map((p) => PRIORITY_COLORS[p._id] || '#64748b'),
        borderWidth: 2,
      },
    ],
  };

  const trendLabels = (monthlyTrend || []).map((m) => `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`);
  const trendChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Reminders Created',
        data: (monthlyTrend || []).map((m) => m.count),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px', background: `${c.color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color
            }}>
              <c.icon size={16} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{c.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Priority Breakdown</h3>
          <div style={{ height: '260px', display: 'flex', justifyContent: 'center' }}>
            {(priorityDistribution || []).length > 0 ? (
              <div style={{ width: '240px' }}>
                <Pie
                  data={priorityChartData}
                  options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                />
              </div>
            ) : (
              <p style={{ color: '#94a3b8', paddingTop: '90px' }}>No reminders yet.</p>
            )}
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '16px', color: '#1e293b' }}>Monthly Trend</h3>
          <div style={{ height: '260px' }}>
            {trendLabels.length > 0 ? (
              <Line
                data={trendChartData}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }}
              />
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', paddingTop: '90px' }}>No trend data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right', color: '#64748b', fontSize: '13px' }}>
        Completion rate: <strong style={{ color: '#22c55e' }}>{completionRate}%</strong>
      </div>
    </div>
  );
};

export default ReminderAnalytics;