// Simple API helper to point frontend to Django by default
// Configure override via Vite env: VITE_API_BASE

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8001';

export function apiUrl(path) {
  if (!path.startsWith('/')) path = '/' + path;
  return API_BASE.replace(/\/$/, '') + path;
}

export async function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), options);
}
