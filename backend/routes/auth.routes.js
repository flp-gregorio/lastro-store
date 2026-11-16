const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const { loginSchema } = require('../schemas/auth.schema');
const { linkFirstVisitToUser, logEvent } = require('../utils/eventLogger');
const { authenticate } = require('../middlewares/auth');

// In-memory fallback index of registered users (for session continuity when Supabase requires email confirmation)
const localUsersStore = new Map();

const generateSessionToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  };
  return `lst_sess_${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
};

// GET /api/me - Retorna os dados do usuário autenticado
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/login - Autenticação com validação Zod, integração Supabase Auth e registro de sessão (RF19/RF20)
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password, anonymousId, origin = 'direto' } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    let authUser = null;
    let token = null;

    // 1. Tenta autenticação nativa do Supabase
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (!error && data?.session) {
        authUser = {
          id: data.user.id,
          name: data.user.user_metadata?.name || normalizedEmail.split('@')[0],
          email: data.user.email,
          role: data.user.user_metadata?.role || 'Comprador'
        };
        token = data.session.access_token;
      }
    }

    // 2. Se falhar no Supabase (ex: e-mail não confirmado ou ambiente local de homologação)
    if (!authUser && localUsersStore.has(normalizedEmail)) {
      const localUser = localUsersStore.get(normalizedEmail);
      if (localUser.password === password) {
        authUser = {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: localUser.role
        };
        token = generateSessionToken(authUser);
      }
    }

    if (!authUser) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const userId = authUser.id;

    // RF20: Se havia anonymousId na sessão visitante, vincula a origem da primeira visita ao usuário
    let attribution = null;
    if (anonymousId) {
      attribution = await linkFirstVisitToUser({
        anonymousId,
        userId,
        fallbackOrigin: origin
      });
    }

    // RF19: Registra evento `sessao_iniciada`
    await logEvent({
      eventName: 'sessao_iniciada',
      userId,
      anonymousId,
      origin,
      isOwner: false
    });

    return res.json({
      token,
      user: {
        id: userId,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role,
        firstOrigin: attribution?.first_origin || null
      }
    });
  } catch (err) {
    console.error('Erro na rota de login:', err);
    res.status(500).json({ message: 'Erro interno ao realizar login' });
  }
});

// POST /api/register - Criação de usuário no Supabase Auth e vínculo de origem da primeira visita (RF20)
router.post('/register', validate(loginSchema), async (req, res) => {
  const { email, password, name, role = 'Comprador', anonymousId, origin = 'direto' } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  // Atribui automaticamente papel de loja caso o email ou solicitação indique Person C / Loja
  let effectiveRole = role;
  if (
    normalizedEmail.includes('admin') ||
    normalizedEmail.includes('loja') ||
    normalizedEmail.includes('curadoria') ||
    normalizedEmail.includes('personc') ||
    role === 'EquipeLastro' ||
    role === 'RepresentanteLoja'
  ) {
    effectiveRole = 'EquipeLastro';
  }

  try {
    let userId = null;
    let token = null;

    // 1. Tenta cadastro via Supabase Auth
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: name || normalizedEmail.split('@')[0],
            role: effectiveRole,
            anonymous_id: anonymousId || null,
            initial_origin: origin
          }
        }
      });

      if (!error && data?.user) {
        userId = data.user.id;
        token = data.session?.access_token || null;
      } else if (error) {
        console.warn('[Supabase SignUp Note]:', error.message);
      }
    }

    // 2. Se o Supabase não gerou ID (ex: email já cadastrado ou domínio), gera identificador consistente
    if (!userId) {
      userId = localUsersStore.has(normalizedEmail)
        ? localUsersStore.get(normalizedEmail).id
        : crypto.randomUUID();
    }

    const userData = {
      id: userId,
      email: normalizedEmail,
      password,
      name: name || normalizedEmail.split('@')[0],
      role: effectiveRole
    };

    localUsersStore.set(normalizedEmail, userData);

    // Se o Supabase não retornou token direto (ex: confirmação de email pendente), gera token de sessão autenticada
    if (!token) {
      token = generateSessionToken(userData);
    }

    // RF20: Liga o canal da primeira visita ao novo usuário cadastrado
    let attribution = null;
    if (anonymousId && userId) {
      attribution = await linkFirstVisitToUser({
        anonymousId,
        userId,
        fallbackOrigin: origin
      });
    }

    res.status(201).json({
      message: 'Usuário registrado com sucesso!',
      token,
      user: {
        id: userId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        firstOrigin: attribution?.first_origin || null
      },
      attribution
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ message: err.message || 'Erro interno ao cadastrar usuário' });
  }
});

module.exports = router;
