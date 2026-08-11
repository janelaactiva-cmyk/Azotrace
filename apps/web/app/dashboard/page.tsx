// Server Component - sem 'use client'
import DashboardClient from './DashboardClient';

// Configuração de navegação instantânea (válida em Server Components)
export const instant = false;

export default function DashboardPage() {
  // Este é um Server Component que apenas importa o Client Component
  return <DashboardClient />;
}
