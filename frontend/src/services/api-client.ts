import { getAccessToken } from './token-storage';
import { handleUnauthorized } from './auth';

export type ApiErrorClass = new (message: string, status: number) => Error;

export function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function assertOk(response: Response, errorClass: ApiErrorClass): Promise<void> {
  if (response.status === 401) {
    handleUnauthorized();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new errorClass(body.error ?? `HTTP ${response.status}`, response.status);
  }
}

export async function handleResponse<T>(response: Response, errorClass: ApiErrorClass): Promise<T> {
  await assertOk(response, errorClass);
  return response.json() as Promise<T>;
}
