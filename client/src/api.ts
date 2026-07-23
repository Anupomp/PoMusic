// JWT lives in module memory only — never localStorage.
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(t: string | null): void { token = t; }
export function getToken(): string | null { return token; }
export function setUnauthorizedHandler(fn: () => void): void { onUnauthorized = fn; }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401 && token) {
    token = null;
    onUnauthorized?.();
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* non-JSON error body */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
