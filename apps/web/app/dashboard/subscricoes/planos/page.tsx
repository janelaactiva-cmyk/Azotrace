import PlanCatalogEditor from './plan-catalog-client';

// A sessão e as permissões são validadas no browser pelo dashboard.
export const instant = false;

export default function Page() {
  return <PlanCatalogEditor />;
}
