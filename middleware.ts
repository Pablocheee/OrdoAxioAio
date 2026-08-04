export const config = {
  runtime: 'experimental-edge',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - axio-hq-secret-access (admin dashboard)
     * - _vite (vite assets)
     * - assets (static assets)
     * - favicon.ico (favicon file)
     */
    '/((?!api|axio-hq-secret-access|_vite|assets|favicon.ico).*)',
  ],
};

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  const aiBots = [
    'ChatGPT-User',
    'Google-Extended',
    'YandexAdditional',
    'PerplexityBot',
    'Sber',
    'GigaChat'
  ];

  const isAiBot = aiBots.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );

  const requestInit: RequestInit = {
    method: request.method,
    headers: request.headers,
    redirect: 'manual'
  };

  // Only include body for methods that allow it
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    requestInit.body = request.body;
  }

  if (isAiBot) {
    // Rewrite the request to the internal AI delivery API
    const originalUrl = url.toString();
    url.pathname = '/api/ai-delivery';
    
    const newHeaders = new Headers(request.headers);
    newHeaders.set('x-original-url', originalUrl);
    requestInit.headers = newHeaders;

    return fetch(url.toString(), requestInit);
  }

  // Normal User Logic
  // Seamlessly proxy/rewrite the request to the client's original origin server
  // Placeholder for the client's original origin resolution
  const clientOriginalOrigin = 'https://client-original-origin.com'; 
  const proxyUrl = new URL(url.pathname + url.search, clientOriginalOrigin);

  return fetch(proxyUrl.toString(), requestInit);
}
