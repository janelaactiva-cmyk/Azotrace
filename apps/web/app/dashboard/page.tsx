import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { DashboardContent } from './_components/dashboard-content';

export const instant = false;

export default async function DashboardPage() {
  noStore();

  const cookieStore = await cookies();
  const impersonatedEmail = cookieStore.get('impersonate_user_email')?.value;

  return <DashboardContent userEmail={impersonatedEmail || ''} />;
}