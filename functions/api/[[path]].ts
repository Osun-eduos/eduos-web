/**
 * Cloudflare Pages Function: passes /api/* on to the EduOS API, so the browser only ever talks to the web app's own
 * address. That keeps the sign-in cookie first-party (browsers block third-party cookies) and needs no CORS.
 *
 * Set API_ORIGIN in the Pages project (Settings > Variables) if the API is not at the default address below.
 */
interface Env {
  API_ORIGIN?: string;
}

const DEFAULT_API = 'https://osun-eduos-api.onrender.com';

/** Headers that describe this hop, not the visitor's request; the forwarding headers are set again below. */
const DROP = new Set(['host', 'connection', 'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cf-worker', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host', 'x-real-ip']);

export const onRequest = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const url = new URL(request.url);
  const base = (env.API_ORIGIN || DEFAULT_API).replace(/\/+$/, '');
  const target = base + (url.pathname.replace(/^\/api/, '') || '/') + url.search;

  const headers = new Headers();
  request.headers.forEach((v, k) => {
    if (!DROP.has(k.toLowerCase())) headers.set(k, v);
  });
  // The API's sign-in rate limit and audit log need the visitor's address (set TRUST_PROXY=2 on the API).
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) headers.set('x-forwarded-for', ip);
  headers.set('x-forwarded-proto', 'https');
  headers.set('x-forwarded-host', url.host);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });
    const res = new Response(upstream.body, upstream);
    if (!res.headers.has('cache-control')) res.headers.set('cache-control', 'no-store');
    return res;
  } catch {
    return Response.json({ message: 'The EduOS server cannot be reached right now. Try again in a minute.' }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
};
