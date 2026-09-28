export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:3001';
const tokenKey = 'market-admin-token';

export type AdminUser = { id: string; email: string; role: 'ADMIN' | 'REVIEWER' | 'VIEWER'; displayName: string | null };

export function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(tokenKey);
}

export function setAdminToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(tokenKey, token);
  else window.localStorage.removeItem(tokenKey);
}

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export async function adminGet<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { cache: 'no-store', headers: authHeaders() });
  return parseResponse<T>(response);
}

export async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body ?? {}),
  });
  return parseResponse<T>(response);
}

export async function adminPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body ?? {}),
  });
  return parseResponse<T>(response);
}

export async function signInAdmin(email: string, password: string) {
  const result = await adminPost<{ token: string; user: AdminUser }>('/admin/auth/sign-in', { email, password });
  setAdminToken(result.token);
  return result.user;
}
