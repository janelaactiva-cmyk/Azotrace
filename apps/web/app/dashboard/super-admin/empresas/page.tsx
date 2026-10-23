import CompaniesPage from './CompaniesPage';

// A sessão é validada pelo layout do dashboard e novamente na API.
export const instant = false;

export default function Page() {
  return <CompaniesPage />;
}
