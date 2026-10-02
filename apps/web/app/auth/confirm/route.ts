import { NextRequest, NextResponse } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { getSupabaseServerClient } from '~/lib/supabase-server';

import pathsConfig from '~/config/paths.config';

export async function GET(request: NextRequest) {
  const service = createAuthCallbackService(await getSupabaseServerClient());

  const url = await service.verifyTokenHash(request, {
    redirectPath: pathsConfig.app.home,
  });

  return NextResponse.redirect(url);
}
