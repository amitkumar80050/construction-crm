import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadProfile from './pages/LeadProfile';
import AddLead from './pages/AddLead';
import Remarks from './pages/Remarks';
import Stages from './pages/Stages';
import Reminders from './pages/Reminders';
import CallingPanel from './pages/CallingPanel';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import MyLogs from './pages/logs/MyLogs';
import EmployeeLogs from './pages/manager/EmployeeLogs';
import EmployeeLogDetails from './pages/manager/EmployeeLogDetails';
import TeamManagement from './pages/admin/TeamManagement';
import TeamChat from './pages/TeamChat';
import WhatsApp from './pages/WhatsApp';
import MyTeam from './pages/MyTeam';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerLeads from './pages/manager/ManagerLeads';
import ManagerTeam from './pages/manager/ManagerTeam';
import Attendance from './pages/Attendance';
import AttendanceApproval from './pages/manager/AttendanceApproval';
import TelecallerDashboard from './pages/TelecallerDashboard';
import SalesExecutiveDashboard from './pages/SalesExecutiveDashboard';
import SiteVisits from './pages/SiteVisits';
import ExportData from './pages/ExportData';

// Route Guards
import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';

// Hooks
import { useAuth } from './hooks/useAuth';
import ImportData from './pages/ImportData';
import EditLead from './pages/EditLead';
import VerifyOTP from './pages/VerifyOTP';
import VerifyUser from './pages/VerifyUser';
import MyVisits from './pages/MyVisits';
import VisitDetail from './pages/VisitDetail';

function AppContent() {
  const { isAuthenticated, user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/verify-user" element={<VerifyUser />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route element={user?.role === 'admin' ? <AdminLayout /> : <UserLayout />}>
            <Route path="/dashboard" element={user?.role === 'auditor' ? <MyLogs /> : user?.role === 'manager' ? <ManagerDashboard /> : user?.role === 'telecaller' ? <TelecallerDashboard /> : user?.role === 'sales executer' ? <SalesExecutiveDashboard /> : <Dashboard />} />
            <Route path="/site-visits" element={<SiteVisits />} />
            <Route path="/my-visits" element={['sales executer', 'manager', 'admin'].includes(user?.role) ? <MyVisits /> : <Navigate to="/dashboard" replace />} />
            <Route path="/visits/:id" element={<VisitDetail />} />
            <Route path="/manager-dashboard" element={user?.role === 'manager' || user?.role === 'admin' ? <ManagerDashboard /> : <Navigate to="/dashboard" />} />
            <Route path="/manager/team" element={user?.role === 'manager' || user?.role === 'admin' ? <ManagerTeam /> : <Navigate to="/dashboard" replace />} />
            <Route path="/manager/leads" element={user?.role === 'manager' || user?.role === 'admin' ? <ManagerLeads /> : <Navigate to="/dashboard" replace />} />
            <Route path="/import" element={['admin', 'manager'].includes(user?.role) ? <ImportData /> : <Navigate to="/dashboard" replace />} />
            <Route path="/export" element={['admin', 'manager'].includes(user?.role) ? <ExportData /> : <Navigate to="/dashboard" replace />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/manager/attendance" element={user?.role === 'manager' || user?.role === 'admin' ? <AttendanceApproval /> : <Navigate to="/dashboard" replace />} />
            <Route path="/Leads" element={<Leads />} />
            <Route path="/Leads/:id" element={<LeadProfile />} />
            <Route path="/Leads/:id/edit" element={<EditLead />} />
            <Route path="/Leads/new" element={['admin', 'manager'].includes(user?.role) ? <AddLead /> : <Navigate to="/Leads" replace />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/:id" element={<LeadProfile />} />
            <Route path="/leads/:id/edit" element={<EditLead />} />
            <Route path="/leads/new" element={['admin', 'manager'].includes(user?.role) ? <AddLead /> : <Navigate to="/Leads" replace />} />
            <Route path="/clients" element={<Navigate to="/Leads" replace />} />
            <Route path="/clients/*" element={<Navigate to="/Leads" replace />} />
            <Route path="/remarks" element={<Remarks />} />
            <Route path="/stages" element={<Stages />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/calling" element={<CallingPanel />} />
            <Route path="/manager/dashboard" element={user?.role === 'manager' || user?.role === 'admin' ? <ManagerDashboard /> : <Navigate to="/dashboard" replace />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/my-team" element={<MyTeam />} />
            <Route path="/my-team/:teamId" element={<TeamChat />} />
            <Route path="/teams/:teamId/chat" element={<TeamChat />} />
            <Route path="/logs" element={<MyLogs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />

            {/* Admin only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<Users />} />
              <Route path="/teams" element={<TeamManagement />} />
            </Route>
          </Route>
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/manager/logs/employees" element={<EmployeeLogs />} />
          <Route path="/manager/logs/:userId" element={<EmployeeLogDetails />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;