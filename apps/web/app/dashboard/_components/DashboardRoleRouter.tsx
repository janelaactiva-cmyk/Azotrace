'use client';

import { useLocalUser } from '../_lib/use-local-user';

import { getCurrentLocalUser, LOCAL_SESSION_EVENT, LOCAL_USERS_EVENT, type LocalAppUser } from '../_lib/local-users';
import { ProducerDashboard } from './ProducerDashboard';
import { SuperAdminDashboard } from './SuperAdminDashboard';

export function DashboardRoleRouter() {
  const user = useLocalUser();

  if (!user) {
    return <div style={{ padding: 24, color: '#6b7280', fontSize: 13 }}>A preparar o dashboard…</div>;
  }

  if (!user.active) return <div style={{ padding: 24 }}>A conta selecionada está inativa ou já não existe.</div>;
  return user.role === 'superadmin' ? <SuperAdminDashboard /> : <ProducerDashboard />;
}
