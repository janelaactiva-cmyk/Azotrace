'use client';
import { useLocalUser } from '~/app/dashboard/_lib/use-local-user';
import ChatbotLauncher from './ChatbotLauncher';
export default function DashboardChatbot() {
  const user = useLocalUser();
  if (!user.id || user.role === 'superadmin') return null;
  return <ChatbotLauncher key={user.id} mode="tickets" />;
}
