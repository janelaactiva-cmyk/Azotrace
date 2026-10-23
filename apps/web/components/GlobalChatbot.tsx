'use client';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChatbotLauncher from './ChatbotLauncher';

// Do not ship dashboard identity/workspace code to visitors of public pages.
const DashboardChatbot = dynamic(() => import('./DashboardChatbot'), { ssr: false });
export default function GlobalChatbot() {
  const pathname = usePathname();
  const insideDashboard = pathname === '/dashboard' || pathname?.startsWith('/dashboard/');
  return insideDashboard ? <DashboardChatbot /> : <ChatbotLauncher mode="help" />;
}
