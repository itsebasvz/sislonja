const base = process.env.API_URL || 'http://127.0.0.1:2900';
export const apiPublica = process.env.API_PUBLIC_URL || 'http://localhost:2900';
export class ErrorApi extends Error {
  constructor(status, data) {
    super(data?.error || 'No se pudo completar la operación.');
    this.status = status;
    this.data = data;
  }
}
export async function api(path, {token, method = 'GET', body, raw, contentType, response = false} = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (raw) headers['Content-Type'] = contentType;
  else if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(base + '/api' + path, {
      method, headers, body: raw || (body === undefined ? undefined : JSON.stringify(body)),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ErrorApi(503, {error:'La API de Lonja no está disponible. Intenta de nuevo.'});
  }
  if (!res.ok) throw new ErrorApi(res.status, await res.json().catch(() => null));
  if (response) return res;
  return res.status === 204 ? null : res.json();
}
export async function fotoApi(path) {
  const res = await fetch(base + path, {signal: AbortSignal.timeout(10000)});
  if (!res.ok) throw new ErrorApi(res.status);
  return res;
}
