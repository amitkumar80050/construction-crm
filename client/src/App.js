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
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import AddClient from './pages/AddClient';
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



// Route Guards
import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';

// Hooks
import { useAuth } from './hooks/useAuth';
import ImportData from './pages/ImportData';
import EditClient from './pages/EditClient';
import VerifyOTP from './pages/VerifyOTP';
import VerifyUser from './pages/VerifyUser';

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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientProfile />} />
            <Route path="/clients/:id/edit" element={<EditClient />} />
            <Route path="/clients/new" element={<AddClient />} />
            <Route path="/remarks" element={<Remarks />} />
            <Route path="/stages" element={<Stages />} />
            <Route path="/reminders" element={<Reminders />} />
            {/* <Route path="/calling" element={<CallingPanel />} /> */}
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/my-team" element={<MyTeam />} />
            <Route path="/my-team/:teamId" element={<TeamChat />} />
            <Route path="/logs" element={<MyLogs />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Admin only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<Users />} />
              <Route path="/import" element={<ImportData />} />
              <Route path="/teams" element={<TeamManagement />} />
              <Route path="/teams/:teamId/chat" element={<TeamChat />} />
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