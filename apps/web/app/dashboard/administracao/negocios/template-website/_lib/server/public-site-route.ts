export async function renderPublishedBusinessWebsite(businessId: string) {
  const safeBusinessId = businessId.replace(/[<>&"']/g, '');

  return new Response(
    `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Website Azotrace</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background:#f3f4f6;color:#111827;margin:0;padding:40px}
    main{max-width:720px;margin:8vh auto;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px;box-shadow:0 16px 40px rgba(15,23,42,.08)}
    code{background:#f3f4f6;padding:2px 6px;border-radius:5px}
  </style>
</head>
<body>
  <main>
    <h1>Website ainda não publicado no servidor</h1>
    <p>O editor está atualmente em modo local, porque o Supabase ainda não está ligado.</p>
    <p>Empresa: <code>${safeBusinessId}</code></p>
    <p>Podes editar e pré-visualizar o template no Dashboard. Quando ligares o Supabase, esta rota passa a servir o HTML publicado.</p>
  </main>
</body>
</html>`,
    {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}
