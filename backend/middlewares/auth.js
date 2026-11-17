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

  // Tokens obrigatórios para rotas protegidas; nunca confia em `x-user-role` enviado pelo cliente
  const headerUserId = req.headers['x-user-id'];

  if (!token) {
    return res.status(401).json({ message: 'Autenticação necessária' });
  }

  // 1. If custom internal token format (base64 JSON or signed prefix)
  if (token.startsWith('lst_sess_')) {
    try {
      const payloadBase64 = token.replace('lst_sess_', '');
      const sessionData = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
      const resolvedRole = authRoutes.resolveDatabaseRole
        ? await authRoutes.resolveDatabaseRole({
            userId: sessionData.id,
            email: sessionData.email
          })
        : 'Comprador';
      req.user = {
        id: sessionData.id,
        email: sessionData.email,
        role: resolvedRole,
        name: sessionData.name || sessionData.email?.split('@')[0]
      };
      return next();
    } catch {
      console.warn('[Auth Middleware]: Falha ao decodificar token interno');
    }
  }

  // 1b. Internal fallback session token issued by auth.routes.js (`lastro-session-<userId>`)
  if (token.startsWith('lastro-session-')) {
    const sessionUserId = token.replace('lastro-session-', '').trim();
    const localUser = authRoutes.getLocalUserById?.(sessionUserId);
    if (localUser) {
      const resolvedRole = authRoutes.resolveDatabaseRole
        ? await authRoutes.resolveDatabaseRole({
            userId: localUser.id,
            email: localUser.email
          })
        : localUser.role || 'Comprador';
      req.user = {
        id: localUser.id,
        email: localUser.email,
        role: resolvedRole,
        name: localUser.name || localUser.email?.split('@')[0]
      };
      return next();
    }

    if (supabase?.auth?.admin?.getUserById) {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(sessionUserId);
        if (!error && data?.user) {
          const resolvedRole = authRoutes.resolveDatabaseRole
            ? await authRoutes.resolveDatabaseRole({
                userId: data.user.id,
                email: data.user.email,
                authUser: data.user
              })
            : data.user.user_metadata?.role || 'Comprador';
          req.user = {
            id: data.user.id,
            email: data.user.email,
            role: resolvedRole,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0]
          };
          return next();
        }
      } catch {
        // fallback below
      }
    }
  }

  // 2. Validate token with Supabase Auth and resolve role from database (`perfis_usuario` / auth metadata)
  if (token && supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        const resolvedRole = authRoutes.resolveDatabaseRole
          ? await authRoutes.resolveDatabaseRole({
              userId: data.user.id,
              email: data.user.email,
              authUser: data.user
            })
          : data.user.app_metadata?.role || data.user.user_metadata?.role || 'Comprador';
        req.user = {
          id: data.user.id,
          email: data.user.email,
          role: resolvedRole,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0]
        };
        return next();
      }
    } catch (err) {
      console.warn('[Auth Middleware - Supabase getUser]:', err.message);
    }
  }

  // Header `x-user-id` sem token válido não concede papel administrativo
  if (headerUserId) {
    return res.status(401).json({ message: 'Token de autenticação válido obrigatório' });
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

