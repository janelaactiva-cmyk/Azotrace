import { connection } from 'next/server';
import { DashboardContent } from './_components/dashboard-content';

export default async function DashboardPage() {
  await connection();

  return <DashboardContent />;
}