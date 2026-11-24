const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

type TokenSource = {
  get: () => string | null;
  refresh: () => Promise<boolean>;
  onPasswordChangeRequired: () => void;
};

let tokens: TokenSource = { get: () => null, refresh: async () => false, onPasswordChangeRequired: () => {} };
export function bindTokens(t: TokenSource) {
  tokens = t;
}

async function parse(res: Response) {
  if (res.status === 204) return null;
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function messageFrom(body: unknown, status: number): { message: string; code?: string } {
  if (body && typeof body === 'object') {
    const b = body as { message?: string | string[]; code?: string };
    const m = Array.isArray(b.message) ? b.message[0] : b.message;
    if (m) return { message: m, code: b.code };
  }
  if (status === 429) return { message: 'Too many attempts. Wait a minute and try again.' };
  if (status >= 500) return { message: 'Something went wrong on the server. Try again shortly.' };
  return { message: `Request failed (${status}).` };
}

/** Calls the API without the auth retry logic (used for sign-in and token refresh). */
export async function rawRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your internet connection.');
  }
  const body = await parse(res);
  if (!res.ok) {
    const { message, code } = messageFrom(body, res.status);
    throw new ApiError(res.status, message, code);
  }
  return body as T;
}

/** Calls the API as the signed-in user, refreshing the session once if it has expired. */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const send = () =>
    rawRequest<T>(path, {
      ...rest,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      headers: { ...(rest.headers ?? {}), ...(tokens.get() ? { Authorization: `Bearer ${tokens.get()}` } : {}) },
    });
  try {
    return await send();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && (await tokens.refresh())) return send();
    if (e instanceof ApiError && e.code === 'PASSWORD_CHANGE_REQUIRED') tokens.onPasswordChangeRequired();
    throw e;
  }
}
