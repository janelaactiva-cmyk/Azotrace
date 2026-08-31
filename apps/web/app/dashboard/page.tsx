export const instant = false;

import { connection } from 'next/server'; // 👈 1. Importe o connection

import { DashboardContent } from './_components/dashboard-content';

export default async function DashboardPage() {
  await connection(); // 👈 2. Adicione isto para torná-la dinâmica

  return <DashboardContent />;
}