export function safeAuthNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/dashboard';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\u0000-\u001f]/.test(decoded)) return '/dashboard';
    const url = new URL(value, 'https://azotrace.invalid');
    if (url.origin !== 'https://azotrace.invalid' || ['/login','/auth/google/callback'].includes(url.pathname.replace(/\/$/,''))) return '/dashboard';
    return url.pathname + url.search + url.hash;
  } catch { return '/dashboard'; }
}

export function googleCallbackUrl(origin: string, next: string) {
  const url = new URL('/auth/google/callback', origin);
  url.searchParams.set('next',safeAuthNext(next));
  return url.href;
}

export function withAuthTimeout<T>(operation: Promise<T>, message: string, milliseconds = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([operation, new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),milliseconds);})]).finally(()=>clearTimeout(timer));
}
