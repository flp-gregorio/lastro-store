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

/**
 * Obtém o identificador consistente do usuário logado (ou visitante anônimo)
 * unificando `localStorage.getItem('user')`, `userId` e `lastro_anon_id`.
 */
export const getCurrentUserId = () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed && parsed.id) {
        return String(parsed.id);
      }
    }
  } catch {
    // ignore JSON error
  }

  const storedId = localStorage.getItem('userId');
  if (storedId) return storedId;

  const anonId = sessionStorage.getItem('lastro_anon_id');
  if (anonId) return anonId;

  return 'anon_user';
};