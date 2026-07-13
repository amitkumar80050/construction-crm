import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import {
  FaUsers,
  FaUserPlus,
  FaCheckCircle,
  FaTimesCircle,
  FaChartLine,
  FaComment,
  FaLayerGroup,
  FaBell,
  FaCalendar
} from 'react-icons/fa';
import clientService from '../services/clientService';
import analyticsService from '../services/analyticsService';
import reminderService from '../services/reminderService';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({ total: 0, leads: 0, active: 0, closed: 0, lost: 0 });
  const [stageDistribution, setStageDistribution] = useState([]);
  const [recentClients, setRecentClients] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardRes, clientsRes, remindersRes] = await Promise.all([
        analyticsService.getDashboardAnalytics(),
        clientService.getClients({ limit: 5 }),
        reminderService.getReminders({ upcoming: 'true', limit: 5 })
      ]);

      const dashboardData = dashboardRes.data?.data;
      if (dashboardData?.clientStats) {
        setStats(dashboardData.clientStats);
      }
      if (dashboardData?.stageDistribution) {
        setStageDistribution(dashboardData.stageDistribution);
      }

      setRecentClients(clientsRes.data?.data || []);
      setUpcomingReminders(remindersRes.data?.data || []);
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to load dashboard data';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const statCards = [
    { title: 'Total Leads', value: stats.total, icon: FaUsers, color: '#2563eb', link: '/clients' },
    { title: 'Leads', value: stats.leads, icon: FaUserPlus, color: '#f59e0b', link: '/clients?status=lead' },
    { title: 'Active', value: stats.active, icon: FaCheckCircle, color: '#22c55e', link: '/clients?status=active' },
    { title: 'Closed', value: stats.closed, icon: FaCheckCircle, color: '#8b5cf6', link: '/clients?status=closed' },
    { title: 'Lost', value: stats.lost, icon: FaTimesCircle, color: '#ef4444', link: '/clients?status=lost' }
  ];

  const getClientStatusStyle = (status) => {
    const styles = {
      active: { background: '#dcfce7', color: '#16a34a' },
      lead: { background: '#fef3c7', color: '#d97706' },
      closed: { background: '#e0e7ff', color: '#7c3aed' },
      lost: { background: '#fee2e2', color: '#dc2626' }
    };
    return styles[status] || { background: '#f1f5f9', color: '#64748b' };
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', color: '#1e293b' }}>
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p style={{ color: '#64748b', marginTop: '5px' }}>
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {statCards.map((stat) => (
          <Link
            to={stat.link}
            key={stat.title}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              textDecoration: 'none',
              transition: 'all 0.3s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `${stat.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: stat.color
            }}>
              <stat.icon />
            </div>
            <div>
              <h3 style={{ fontSize: '24px', color: '#1e293b', margin: 0 }}>
                {loading ? '...' : stat.value}
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{stat.title}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Stage Distribution */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaLayerGroup style={{ color: '#2563eb' }} />
            <h3 style={{ color: '#1e293b', margin: 0 }}>Stage Distribution</h3>
          </div>
          <Link to="/stages" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
            Manage Stages →
          </Link>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading stage data...</p>
        ) : stageDistribution.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No stage data available yet.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {stageDistribution.map((stage, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 18px',
                  background: '#f8fafc',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minWidth: '160px',
                  flex: '1 1 160px'
                }}
              >
                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                  {stage.stageName || 'Unassigned'}
                </span>
                <span style={{
                  marginLeft: 'auto',
                  padding: '3px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: '#dbeafe',
                  color: '#2563eb'
                }}>
                  {stage.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Recent Leads — real data */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ color: '#1e293b', margin: 0 }}>Recent Leads</h3>
            <Link to="/clients" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
              View All →
            </Link>
          </div>

          {loading ? (
            <p style={{ color: '#94a3b8' }}>Loading recent leads...</p>
          ) : recentClients.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>
              No leads yet. <Link to="/clients/new" style={{ color: '#2563eb' }}>Add your first lead</Link>
            </p>
          ) : (
            recentClients.map((client) => {
              const statusStyle = getClientStatusStyle(client.status);
              return (
                <div
                  key={client._id}
                  onClick={() => navigate(`/clients/${client._id}`)}
                  style={{
                    padding: '12px',
                    marginBottom: '10px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>{client.name}</strong>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{client.company}</p>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      ...statusStyle
                    }}>
                      {client.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Upcoming Reminders — real data */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaBell style={{ color: '#2563eb' }} />
              <h3 style={{ color: '#1e293b', margin: 0 }}>Upcoming Reminders</h3>
            </div>
            <Link to="/reminders" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
              View All →
            </Link>
          </div>

          {loading ? (
            <p style={{ color: '#94a3b8' }}>Loading reminders...</p>
          ) : upcomingReminders.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>No upcoming reminders. You're all caught up!</p>
          ) : (
            upcomingReminders.map((reminder) => (
              <div
                key={reminder._id}
                style={{
                  padding: '12px',
                  marginBottom: '10px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${isOverdue(reminder.dueDate) ? '#ef4444' : '#2563eb'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#1e293b' }}>{reminder.title}</strong>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                      {reminder.client?.name || 'Unknown client'}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    color: isOverdue(reminder.dueDate) ? '#ef4444' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}>
                    <FaCalendar size={10} /> {new Date(reminder.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#1e293b', marginBottom: '15px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/clients/new')}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1d4ed8')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#2563eb')}
          >
            <FaUserPlus /> Add Lead
          </button>
          <button
            onClick={() => navigate('/remarks')}
            style={{
              padding: '10px 20px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#7c3aed')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#8b5cf6')}
          >
            <FaComment /> Add Remark
          </button>
          <button
            onClick={() => navigate('/analytics')}
            style={{
              padding: '10px 20px',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#d97706')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f59e0b')}
          >
            <FaChartLine /> View Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;