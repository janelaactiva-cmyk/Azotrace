'use client';
import { useLocalUser } from '../_lib/use-local-user';
import { ProducerDashboard } from './ProducerDashboard';
import { PlatformDashboard } from './PlatformDashboard';
import { AdminDashboardEntry } from './AdminDashboardEntry';

export function DashboardHome() {
  const user = useLocalUser();
  if (!user.active) return <p role="status">A validar a sessão…</p>;
  if (user.role === 'superadmin') return <PlatformDashboard />;
  return user.role === 'admin' ? <AdminDashboardEntry /> : <ProducerDashboard />;
}
