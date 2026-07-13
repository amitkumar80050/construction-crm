import React from 'react';
import LeadChart from '../components/analytics/LeadChart';
import ConversionChart from '../components/analytics/ConversionChart';
import ReminderAnalytics from '../components/analytics/ReminderAnalytics';
import UserPerformance from '../components/analytics/UserPerformance';

const Analytics = () => {
  return (
    <div style={{ padding: '24px', display: 'grid', gap: '30px' }}>
      <div>
        <h1 style={{ fontSize: '28px', color: '#1e293b' }}>Analytics Dashboard</h1>
        <p style={{ color: '#64748b' }}>Track your business performance and insights</p>
      </div>

      <ConversionChart />

      <LeadChart />

      <div>
        <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '16px' }}>Reminders</h2>
        <ReminderAnalytics />
      </div>

      <UserPerformance />
    </div>
  );
};

export default Analytics;