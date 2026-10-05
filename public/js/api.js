const API_ROOT = '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body.erro || body.message || message;
      if (body.detalhes && typeof body.detalhes === 'object') {
        message = Object.values(body.detalhes).join(' · ') || message;
      }
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response;
}

export const get = (path) => request(path);
export const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
export const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
export const patch = (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) });
export const del = (path, body) => request(path, {
  method: 'DELETE',
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export function query(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const result = search.toString();
  return result ? `?${result}` : '';
}
