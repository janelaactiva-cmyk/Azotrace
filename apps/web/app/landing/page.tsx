import { Suspense } from 'react';
import LandingPageClient from './LandingPageClient';
import Pricing from './components/Pricing';
import { getPublicPlanCatalog } from '~/lib/plan-catalog-server';

async function LandingPricing() {
 try {
  const catalog = await getPublicPlanCatalog();
  return <Pricing initialCatalog={catalog} />;
 } catch {
  return <Pricing />;
 }
}
export default function LandingPage() {
 return <LandingPageClient pricing={<Suspense fallback={<section id="pricing" style={{ padding: '70px 20px', scrollMarginTop: 80 }}><p role="status">A carregar planos…</p></section>}><LandingPricing /></Suspense>} />;
}
