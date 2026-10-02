import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '~/lib/supabase-server';

import pathsConfig from '~/config/paths.config';

export async function GET(request: NextRequest) {
  const service = createAuthCallbackService(await getSupabaseServerClient());

  const { nextPath } = await service.exchangeCodeForSession(request, {
    redirectPath: pathsConfig.app.home,
  });

  return redirect(nextPath);
}
