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
import Signup from './pages/Signup';
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

// Route Guards
import PrivateRoute from './routes/PrivateRoute';
import AdminRoute from './routes/AdminRoute';

// Hooks
import { useAuth } from './hooks/useAuth';

function AppContent() {
  const { isAuthenticated, user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/dashboard" />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route element={user?.role === 'admin' ? <AdminLayout /> : <UserLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientProfile />} />
            <Route path="/clients/new" element={<AddClient />} />
            <Route path="/remarks" element={<Remarks />} />
            <Route path="/stages" element={<Stages />} />
            <Route path="/reminders" element={<Reminders />} />
            {/* <Route path="/calling" element={<CallingPanel />} /> */}
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Admin only routes */}
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>
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