const rawUrl = import.meta.env.VITE_API_URL;

const isBrowser = typeof window !== 'undefined';
const isLocalhost =
  isBrowser &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

let API_BASE_URL = '';

if (rawUrl) {
  API_BASE_URL = (
    /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  ).replace(/\/+$/, '');
} else if (!isBrowser || isLocalhost) {
  API_BASE_URL = 'http://localhost:3000';
} else {
  // Production fallback if VITE_API_URL is omitted (uses relative path)
  API_BASE_URL = '';
}

export const apiUrl = (path) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return cleanPath;
  return `${API_BASE_URL}${cleanPath}`;
};
