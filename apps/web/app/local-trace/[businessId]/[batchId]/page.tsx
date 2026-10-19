import { redirect } from 'next/navigation';
export default async function Page({ params }: { params: Promise<{ businessId: string; batchId: string }> }) {
  const { businessId, batchId } = await params;
  redirect(`/trace/${encodeURIComponent(businessId)}/${encodeURIComponent(batchId)}`);
}
