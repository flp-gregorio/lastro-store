
const configuredUrl =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

const API_BASE_URL = (
  /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`
).replace(/\/+$/, '');

export const apiUrl = (path) => {
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};