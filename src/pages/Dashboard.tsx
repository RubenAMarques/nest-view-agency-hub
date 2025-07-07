import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from '@/components/AdminDashboard';
import AgencyDashboard from '@/components/AgencyDashboard';

export default function Dashboard() {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminDashboard /> : <AgencyDashboard />;
}