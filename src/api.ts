const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string, public body?: unknown) {
    super(message);
  }
}

type TokenSource = {
  get: () => string | null;
  refresh: () => Promise<boolean>;
  onPasswordChangeRequired: () => void;
  onTwoStepRequired: () => void;
};

let tokens: TokenSource = { get: () => null, refresh: async () => false, onPasswordChangeRequired: () => {}, onTwoStepRequired: () => {} };
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
      headers: { ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(init.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your internet connection.');
  }
  const body = await parse(res);
  if (!res.ok) {
    const { message, code } = messageFrom(body, res.status);
    throw new ApiError(res.status, message, code, body);
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
    if (e instanceof ApiError && e.code === 'TWO_STEP_SETUP_REQUIRED') tokens.onTwoStepRequired();
    throw e;
  }
}

/** Fetches a file (such as an inspection photo) as the signed-in user and returns a local URL for it. Revoke it when done. */
export async function apiObjectUrl(path: string): Promise<string> {
  const get = () => fetch(BASE + path, { credentials: 'include', headers: tokens.get() ? { Authorization: `Bearer ${tokens.get()}` } : {} });
  let res = await get();
  if (res.status === 401 && (await tokens.refresh())) res = await get();
  if (!res.ok) throw new ApiError(res.status, 'Could not load the file.');
  return URL.createObjectURL(await res.blob());
}

/** Downloads a file (such as an export) as the signed-in user, under the name the server gives it. */
export async function apiDownload(path: string, fallbackName: string) {
  const get = () => fetch(BASE + path, { credentials: 'include', headers: tokens.get() ? { Authorization: `Bearer ${tokens.get()}` } : {} });
  let res = await get();
  if (res.status === 401 && (await tokens.refresh())) res = await get();
  if (!res.ok) {
    const body = await parse(res);
    throw new ApiError(res.status, messageFrom(body, res.status).message);
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
