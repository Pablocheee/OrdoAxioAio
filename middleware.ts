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
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
    requestInit.body = request.body;
    // Edge runtime and Node 18+ require duplex: 'half' when the body is a ReadableStream
    (requestInit as any).duplex = 'half';
  }

  try {
    if (isAiBot) {
      // Rewrite the request to the internal AI delivery API
      const originalUrl = url.toString();
      url.pathname = '/api/ai-delivery';
      
      const newHeaders = new Headers(request.headers);
      newHeaders.set('x-original-url', originalUrl);
      requestInit.headers = newHeaders;

      return await fetch(url.toString(), requestInit);
    }

    // Normal User Logic
    // Seamlessly proxy/rewrite the request to the client's original origin server
    const host = request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;
    
    // Fetch actual origin for this domain
    const originLookup = await fetch(`${baseUrl}/api/get-origin?domain=${encodeURIComponent(host)}`);
    const contentType = originLookup.headers.get('content-type') || '';
    
    if (!originLookup.ok || !contentType.includes('application/json')) {
      return new Response('Client domain not found', { status: 404 });
    }
    
    const { origin: clientOriginalOrigin } = await originLookup.json();

    const proxyUrl = new URL(url.pathname + url.search, clientOriginalOrigin);

    return await fetch(proxyUrl.toString(), requestInit);
  } catch (err) {
    console.error('Middleware proxy error:', err);
    return new Response('Edge Proxy Error', { status: 500 });
  }
}
