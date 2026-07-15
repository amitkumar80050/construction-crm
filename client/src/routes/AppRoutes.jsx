import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import AuthLayout from '../layouts/AuthLayout';
import RoleLayout from '../layouts/RoleLayout';

import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';

import Login from '../pages/Login';
import Signup from '../pages/Signup';

import Dashboard from '../pages/Dashboard';
import Clients from '../pages/Clients';
import AddClient from '../pages/AddClient';
import EditClient from '../pages/EditClient';
import ClientProfile from '../pages/ClientProfile';
import Remarks from '../pages/Remarks';
import Reminders from '../pages/Reminders';
import Profile from '../pages/Profile';
import Settings from '../pages/Settings';
import ExportData from '../pages/ExportData';

import Stages from '../pages/Stages';
import Analytics from '../pages/Analytics';
import Users from '../pages/Users';
import ImportData from '../pages/ImportData';
import CallingPanel from '../pages/CallingPanel';

const AppRoutes = () => {
  return (
    <Routes>
      {/* --- Public routes --- */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* --- Authenticated routes (any logged-in user) --- */}
      <Route element={<PrivateRoute />}>
        <Route element={<RoleLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/new" element={<AddClient />} />
          <Route path="/clients/:id" element={<ClientProfile />} />
          <Route path="/clients/:id/edit" element={<EditClient />} />

          <Route path="/remarks" element={<Remarks />} />
          <Route path="/reminders" element={<Reminders />} />

          <Route path="/export" element={<ExportData />} />

          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />

          {/* --- Admin-only routes --- */}
          <Route element={<AdminRoute />}>
            <Route path="/stages" element={<Stages />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/users" element={<Users />} />
            <Route path="/import" element={<ImportData />} />
            <Route path="/calling" element={<CallingPanel />} />
          </Route>
        </Route>
      </Route>

      {/* --- Fallbacks --- */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;