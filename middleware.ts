import { rewrite, next } from '@vercel/edge';

// Emulate Next.js NextResponse for dynamic routing using @vercel/edge
const NextResponse = {
  next,
  rewrite
};

export const config = {
  runtime: 'experimental-edge',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static, _next/image (static assets if using Next.js)
     * - _vite, assets (static assets for Vite)
     * - favicon.ico, images, and fonts
     */
    '/((?!api|_next/static|_next/image|_vite|assets|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|woff2?|ico)).*)',
  ],
};

export default async function middleware(req: Request) {
  const url = new URL(req.url);
  const hostname = req.headers.get('host') || '';
  const userAgent = req.headers.get('user-agent') || '';

  // Zero Regression: Preserve AI Bot interception
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

  if (isAiBot) {
    const originalUrl = url.toString();
    const proxyUrl = new URL('/api/ai-delivery', req.url);
    
    const newHeaders = new Headers(req.headers);
    newHeaders.set('x-original-url', originalUrl);
    
    return NextResponse.rewrite(proxyUrl.toString(), {
      request: { headers: newHeaders }
    });
  }

  // [BYPASS LOGIC]: Bypass system domains and deployment aliases
  if (
    hostname === 'localhost' || 
    hostname.includes('localhost:') || 
    hostname.endsWith('.vercel.app')
  ) {
    return NextResponse.next();
  }

  // [DYNAMIC ROUTING]: Custom client domains
  try {
    const apiUrl = new URL('/api/get-origin?domain=' + encodeURIComponent(hostname), req.url);
    const originLookup = await fetch(apiUrl.toString());
    const contentType = originLookup.headers.get('content-type') || '';
    
    if (originLookup.ok && contentType.includes('application/json')) {
      const data = await originLookup.json();
      if (data.success && data.origin) {
        const proxyUrl = new URL(url.pathname + url.search, data.origin);
        return NextResponse.rewrite(proxyUrl.toString());
      }
    }
    
    return NextResponse.next();
  } catch (err) {
    console.error('Middleware proxy error:', err);
    return NextResponse.next();
  }
}

