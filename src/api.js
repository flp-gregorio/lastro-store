const configuredUrl = (import.meta.env.VITE_API_URL || '').trim();

// Se VITE_API_URL estiver definida, usa ela.
// Caso contrário:
// - Em produção (Vercel), usa caminho relativo '' (ex: /api/pecas no mesmo domínio).
// - Em desenvolvimento local, usa http://localhost:3000.
const API_BASE_URL = configuredUrl
  ? (/^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`).replace(/\/+$/, '')
  : import.meta.env.PROD
    ? ''
    : 'http://localhost:3000';

export const apiUrl = (path) => {
  const normalizedPath = `${path.startsWith('/') ? '' : '/'}${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const readStorageValue = (key) => {
  try {
    const fromSession = sessionStorage.getItem(key);
    if (fromSession !== null && fromSession !== '') {
      return fromSession;
    }
  } catch {
    // ignore storage access error
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const getCurrentUser = () => {
  try {
    const rawUser = readStorageValue('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // ignore JSON error
  }
  return null;
};

export const getCurrentToken = () => readStorageValue('token');

export const getCurrentUserRole = () =>
  readStorageValue('userRole') || getCurrentUser()?.role || '';

/**
 * Obtém o identificador consistente do usuário logado (ou visitante anônimo),
 * priorizando sessionStorage (isolamento por aba) e caindo para localStorage.
 */
export const getCurrentUserId = () => {
  const user = getCurrentUser();
  if (user && user.id) {
    return String(user.id);
  }

  const storedId = readStorageValue('userId');
  if (storedId) return storedId;

  const anonId = sessionStorage.getItem('lastro_anon_id');
  if (anonId) return anonId;

  return 'anon_user';
};