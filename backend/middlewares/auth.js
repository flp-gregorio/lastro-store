const supabase = require('../config/supabase');
const authRoutes = require('../routes/auth.routes');

const STORE_ROLES = [
  'equipelastro',
  'representanteloja',
  'loja',
  'admin',
  'perito',
  'store_representative',
  'curadoria'
];

const isStoreAuthorized = (role) => {
  if (!role) return false;
  const normalized = String(role).trim().toLowerCase().replace(/[\s_-]/g, '');
  return STORE_ROLES.some((r) => r.replace(/[\s_-]/g, '') === normalized);
};

/**
 * Extracts and validates user session from Authorization header or fallback headers
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Fallback headers for local test harness or direct identification
  const headerUserId = req.headers['x-user-id'];
  const headerUserRole = req.headers['x-user-role'];

  if (!token && !headerUserId) {
    return res.status(401).json({ message: 'Autenticação necessária' });
  }

  // 1. If custom internal token format (base64 JSON or signed prefix)
  if (token && token.startsWith('lst_sess_')) {
    try {
      const payloadBase64 = token.replace('lst_sess_', '');
      const sessionData = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
      req.user = {
        id: sessionData.id,
        email: sessionData.email,
        role: sessionData.role || 'Comprador',
        name: sessionData.name || sessionData.email?.split('@')[0]
      };
      return next();
    } catch (e) {
      console.warn('[Auth Middleware]: Falha ao decodificar token interno');
    }
  }

  // 1b. Internal fallback session token issued by auth.routes.js (`lastro-session-<userId>`)
  if (token && token.startsWith('lastro-session-')) {
    const sessionUserId = token.replace('lastro-session-', '').trim();
    const localUser = authRoutes.getLocalUserById?.(sessionUserId);
    if (localUser) {
      req.user = {
        id: localUser.id,
        email: localUser.email,
        role: localUser.role || 'Comprador',
        name: localUser.name || localUser.email?.split('@')[0]
      };
      return next();
    }

    if (supabase?.auth?.admin?.getUserById) {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(sessionUserId);
        if (!error && data?.user) {
          req.user = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || 'Comprador',
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0]
          };
          return next();
        }
      } catch {
        // fallback below
      }
    }
  }

  // 2. Validate token with Supabase Auth
  if (token && supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        req.user = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'Comprador',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0]
        };
        return next();
      }
    } catch (err) {
      console.warn('[Auth Middleware - Supabase getUser]:', err.message);
    }
  }

  // 3. Fallback to header user identification (useful for test suites or simulated roles)
  if (headerUserId) {
    req.user = {
      id: headerUserId,
      email: req.headers['x-user-email'] || `${headerUserId}@lastro.com`,
      role: headerUserRole || 'Comprador',
      name: req.headers['x-user-name'] || 'Usuário'
    };
    return next();
  }

  return res.status(401).json({ message: 'Sessão inválida ou expirada' });
};

/**
 * Ensures user is authenticated AND has store representative privileges (Person C)
 */
const requireStoreRole = (req, res, next) => {
  authenticate(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: 'Autenticação necessária' });
    }

    if (!isStoreAuthorized(req.user.role)) {
      return res.status(403).json({
        message: 'Acesso negado: permissão de curadoria/loja necessária.'
      });
    }

    next();
  });
};

module.exports = {
  authenticate,
  requireStoreRole,
  isStoreAuthorized
};

