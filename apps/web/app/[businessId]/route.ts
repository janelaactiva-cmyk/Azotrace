import { renderPublishedBusinessWebsite } from '../dashboard/website/template-website/_lib/server/public-site-route';
export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
    }>;
  },
) {
  const { businessId } = await params;

  return renderPublishedBusinessWebsite(businessId);
}
