import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminLayout from './AdminLayout';
import UserLayout from './UserLayout';

// Picks the sidebar/layout shell based on the logged-in user's role,
// so route definitions don't need to be duplicated per role.
const RoleLayout = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminLayout /> : <UserLayout />;
};

export default RoleLayout;