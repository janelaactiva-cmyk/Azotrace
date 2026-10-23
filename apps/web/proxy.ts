import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  // The application uses localStorage + bearer tokens. Only legacy SSR
  // cookie sessions need refreshing here. API routes enforce their own auth.
  const cookies = request.cookies.getAll();
  const hasSessionCookie = cookies.some(cookie => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name));
  if (!hasSessionCookie) return NextResponse.next({ request: { headers: request.headers } });
  let response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(values) {
          for (const { name, value } of values) request.cookies.set(name, value);
          const previousCookies = response.cookies.getAll();
          response = NextResponse.next({ request });
          for (const cookie of previousCookies) response.cookies.set(cookie);
          for (const { name, value, options } of values) response.cookies.set(name, value, options);
        },
      },
    },
  );
  await supabase.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
