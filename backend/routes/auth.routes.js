const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const { loginSchema } = require('../schemas/auth.schema');
const { linkFirstVisitToUser, logEvent } = require('../utils/eventLogger');

// Cache em memória para contas de fallback quando houver rate-limit de SMTP no Supabase
const localUsers = new Map();
const localUsersById = new Map();
// Override programático restrito a chamadas diretas em memória (ex: suíte de testes local)
const programmaticRoleOverrides = new Map();

const saveLocalUser = (userObj) => {
  if (!userObj || !userObj.id) return;
  if (userObj.email) {
    localUsers.set(String(userObj.email).trim().toLowerCase(), userObj);
  }
  localUsersById.set(String(userObj.id), userObj);
};

/**
 * Resolve o papel oficial do usuário a partir do banco de dados:
 * 1. `public.perfis_usuario` (por ID ou e-mail)
 * 2. Metadados do Supabase Auth (`app_metadata.role` ou `user_metadata.role`)
 * 3. Cache local de fallback (apenas quando não encontrado no banco)
 */
const resolveDatabaseRole = async ({ userId = null, email = null, authUser = null } = {}) => {
  const emailKey = email ? String(email).trim().toLowerCase() : null;

  if (userId && programmaticRoleOverrides.has(String(userId))) {
    return programmaticRoleOverrides.get(String(userId));
  }
  if (emailKey && programmaticRoleOverrides.has(emailKey)) {
    return programmaticRoleOverrides.get(emailKey);
  }

  if (supabase) {
    try {
      if (userId) {
        const { data: byId, error: byIdErr } = await supabase
          .from('perfis_usuario')
          .select('role')
          .eq('id', String(userId))
          .maybeSingle();

        if (!byIdErr && byId?.role) {
          return byId.role;
        }
      }

      if (emailKey) {
        const { data: byEmail, error: byEmailErr } = await supabase
          .from('perfis_usuario')
          .select('role')
          .ilike('email', emailKey)
          .maybeSingle();

        if (!byEmailErr && byEmail?.role) {
          return byEmail.role;
        }
      }
    } catch {
      // Fallback para metadata / memória caso `public.perfis_usuario` ainda não exista
    }
  }

  const metadataRole = authUser?.app_metadata?.role || authUser?.user_metadata?.role;
  if (metadataRole) {
    return metadataRole;
  }

  if (userId && localUsersById.has(String(userId))) {
    return localUsersById.get(String(userId)).role || 'Comprador';
  }
  if (emailKey && localUsers.has(emailKey)) {
    return localUsers.get(emailKey).role || 'Comprador';
  }

  return 'Comprador';
};

/**
 * Registra perfil inicial padrão ('Comprador') em `public.perfis_usuario` sem sobrescrever papéis pré-definidos no banco
 */
const ensureDatabaseProfile = async ({ userId, email, name }) => {
  if (!supabase || !userId) return;
  const emailKey = email ? String(email).trim().toLowerCase() : null;

  try {
    const { data: existingById } = await supabase
      .from('perfis_usuario')
      .select('id')
      .eq('id', String(userId))
      .maybeSingle();

    if (existingById) return;

    await supabase
      .from('perfis_usuario')
      .insert([
        {
          id: String(userId),
          email: emailKey,
          nome: name || (emailKey ? emailKey.split('@')[0] : 'Usuário'),
          role: 'Comprador'
        }
      ]);
  } catch {
    // Tabela opcional caso migração SQL ainda não tenha sido aplicada
  }
};

const setLocalUserRole = async (identifier, newRole) => {
  if (!identifier || !newRole) return null;
  const key = String(identifier).trim();
  const keyLower = key.toLowerCase();

  programmaticRoleOverrides.set(key, newRole);
  programmaticRoleOverrides.set(keyLower, newRole);

  let target = localUsersById.get(key) || localUsers.get(keyLower) || null;
  if (target) {
    target.role = newRole;
    saveLocalUser(target);
    if (target.id) {
      programmaticRoleOverrides.set(String(target.id), newRole);
    }
    if (target.email) {
      programmaticRoleOverrides.set(String(target.email).trim().toLowerCase(), newRole);
    }
  }

  if (supabase) {
    try {
      const col = key.includes('@') ? 'email' : 'id';
      await supabase
        .from('perfis_usuario')
        .update({ role: newRole, atualizado_em: new Date().toISOString() })
        .eq(col, key.includes('@') ? keyLower : key);
    } catch {
      // ignore if perfis_usuario not yet provisioned or RLS prevents client update
    }
  }

  return target;
};

// POST /api/login - Autenticação com validação Zod, integração Supabase Auth e registro de sessão (RF19/RF20)
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password, anonymousId, origin = 'direto' } = req.body;
  const emailKey = String(email || '').trim().toLowerCase();

  try {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!error && data?.session) {
        const userId = data.user.id;
        const resolvedRole = await resolveDatabaseRole({
          userId,
          email: data.user.email,
          authUser: data.user
        });

        saveLocalUser({
          id: userId,
          name: data.user.user_metadata?.name || email.split('@')[0],
          email: data.user.email,
          password,
          role: resolvedRole
        });

        // RF20: Se havia anonymousId na sessão visitante, vincula a origem da primeira visita ao usuário
        let attribution = null;
        if (anonymousId) {
          attribution = await linkFirstVisitToUser({
            anonymousId,
            userId,
            fallbackOrigin: origin
          });
        }

        // RF19: Registra evento `sessao_iniciada` com a origem
        await logEvent({
          eventName: 'sessao_iniciada',
          userId,
          anonymousId,
          origin,
          isOwner: false
        });

        return res.json({
          token: data.session.access_token,
          user: {
            id: userId,
            name: data.user.user_metadata?.name || email.split('@')[0],
            email: data.user.email,
            role: resolvedRole,
            firstOrigin: attribution?.first_origin || data.user.user_metadata?.first_origin || null
          }
        });
      }

      if (error) {
        const fallbackUser = localUsers.get(emailKey);
        if (fallbackUser && fallbackUser.password === password) {
          const resolvedRole = await resolveDatabaseRole({
            userId: fallbackUser.id,
            email: fallbackUser.email
          });
          fallbackUser.role = resolvedRole;
          await logEvent({
            eventName: 'sessao_iniciada',
            userId: fallbackUser.id,
            anonymousId,
            origin,
            isOwner: false
          });
          return res.json({
            token: `lastro-session-${fallbackUser.id}`,
            user: {
              id: fallbackUser.id,
              name: fallbackUser.name,
              email: fallbackUser.email,
              role: resolvedRole,
              firstOrigin: null
            }
          });
        }
        console.warn('[Supabase Auth Login Warning]:', error.message);
        return res.status(401).json({ message: error.message || 'E-mail ou senha inválidos' });
      }
    }

    const fallbackUser = localUsers.get(emailKey);
    if (fallbackUser && fallbackUser.password === password) {
      return res.json({
        token: `lastro-session-${fallbackUser.id}`,
        user: {
          id: fallbackUser.id,
          name: fallbackUser.name,
          email: fallbackUser.email,
          role: fallbackUser.role,
          firstOrigin: null
        }
      });
    }

    return res.status(500).json({ message: 'Supabase não está configurado no .env' });
  } catch (err) {
    console.error('Erro na rota de login:', err);
    res.status(500).json({ message: 'Erro interno ao realizar login' });
  }
});

// POST /api/register - Criação de usuário no Supabase Auth com papel padrão 'Comprador' (admin definido no banco)
router.post('/register', validate(loginSchema), async (req, res) => {
  const { email, password, name, anonymousId, origin = 'direto' } = req.body;

  if (!supabase) {
    return res.status(500).json({ message: 'Supabase não está configurado no .env' });
  }

  // Todo auto-cadastro nasce como 'Comprador'; promoção para curadoria/admin ocorre diretamente no banco
  const initialRole = 'Comprador';
  const userMetadata = {
    name: name || email.split('@')[0],
    role: initialRole,
    anonymous_id: anonymousId || null,
    initial_origin: origin
  };

  try {
    let createdUser = null;
    let sessionToken = null;

    // 1. Tenta criar via Admin API (email_confirm: true) para não depender de confirmação de e-mail nem cair em rate-limit SMTP do Supabase
    if (supabase.auth?.admin?.createUser) {
      const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata
      });

      if (!adminError && adminData?.user) {
        createdUser = adminData.user;
      } else if (adminError && /already|registered|exists/i.test(adminError.message)) {
        // Se o e-mail já estava cadastrado, tenta autenticar diretamente com a senha informada
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (!loginError && loginData?.user) {
          createdUser = loginData.user;
          sessionToken = loginData.session?.access_token || null;
        } else {
          return res.status(400).json({
            message: 'Este e-mail já está cadastrado. Use a aba "Entrar" para fazer login.'
          });
        }
      }
    }

    // 2. Caso não tenha sido criado via Admin API (ex: chave anon), usa signUp padrão
    if (!createdUser) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: userMetadata }
      });

      if (signUpError) {
        console.warn('[Supabase Register Warning]:', signUpError.message);
        // Se for erro de rate-limit de e-mail do Supabase ou domínio de teste bloqueado, cria sessão local de fallback
        if (/rate limit|invalid|not authorized/i.test(signUpError.message)) {
          const fallbackUserId = crypto.randomUUID();
          await ensureDatabaseProfile({
            userId: fallbackUserId,
            email,
            name: userMetadata.name
          });
          const resolvedRole = await resolveDatabaseRole({ userId: fallbackUserId, email });
          saveLocalUser({
            id: fallbackUserId,
            name: userMetadata.name,
            email,
            password,
            role: resolvedRole
          });
          const attribution = anonymousId
            ? await linkFirstVisitToUser({ anonymousId, userId: fallbackUserId, fallbackOrigin: origin })
            : null;

          return res.status(201).json({
            message: 'Usuário registrado com sucesso!',
            token: `lastro-session-${fallbackUserId}`,
            user: {
              id: fallbackUserId,
              name: userMetadata.name,
              email,
              role: resolvedRole,
              firstOrigin: attribution?.first_origin || null
            },
            attribution
          });
        }

        return res.status(400).json({ message: signUpError.message });
      }

      createdUser = signUpData?.user;
      sessionToken = signUpData?.session?.access_token || null;
    }

    // 3. Obtém token de sessão caso ainda não tenha (pós admin.createUser)
    if (createdUser && !sessionToken) {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      sessionToken = signInData?.session?.access_token || `lastro-session-${createdUser.id}`;
    }

    if (createdUser) {
      await ensureDatabaseProfile({
        userId: createdUser.id,
        email: createdUser.email || email,
        name: createdUser.user_metadata?.name || userMetadata.name
      });
    }

    const resolvedRole = createdUser
      ? await resolveDatabaseRole({
          userId: createdUser.id,
          email: createdUser.email || email,
          authUser: createdUser
        })
      : initialRole;

    if (createdUser) {
      saveLocalUser({
        id: createdUser.id,
        name: createdUser.user_metadata?.name || userMetadata.name,
        email: createdUser.email || email,
        password,
        role: resolvedRole
      });
    }

    // RF20: Liga o canal da primeira visita ao novo usuário cadastrado
    let attribution = null;
    if (anonymousId && createdUser?.id) {
      attribution = await linkFirstVisitToUser({
        anonymousId,
        userId: createdUser.id,
        fallbackOrigin: origin
      });
    }

    // RF19: Registra início de sessão
    if (createdUser?.id) {
      await logEvent({
        eventName: 'sessao_iniciada',
        userId: createdUser.id,
        anonymousId,
        origin,
        isOwner: false
      });
    }

    res.status(201).json({
      message: 'Usuário registrado com sucesso!',
      token: sessionToken,
      user: {
        id: createdUser.id,
        name: createdUser.user_metadata?.name || userMetadata.name,
        email: createdUser.email,
        role: resolvedRole,
        firstOrigin: attribution?.first_origin || null
      },
      attribution
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ message: err.message || 'Erro interno ao cadastrar usuário' });
  }
});

router.getLocalUserById = (id) => localUsersById.get(String(id)) || null;
router.resolveDatabaseRole = resolveDatabaseRole;
router.setLocalUserRole = setLocalUserRole;

module.exports = router;
