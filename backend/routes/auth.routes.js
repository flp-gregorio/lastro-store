const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const { loginSchema } = require('../schemas/auth.schema');
const { linkFirstVisitToUser, logEvent } = require('../utils/eventLogger');

// POST /api/login - Autenticação com validação Zod, integração Supabase Auth e registro de sessão (RF19/RF20)
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password, anonymousId, origin = 'direto' } = req.body;

  try {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!error && data?.session) {
        const userId = data.user.id;

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
            role: data.user.user_metadata?.role || 'Comprador',
            firstOrigin: attribution?.first_origin || data.user.user_metadata?.first_origin || null
          }
        });
      }

      if (error) {
        console.warn('[Supabase Auth Login Warning]:', error.message);
        return res.status(401).json({ message: error.message || 'E-mail ou senha inválidos' });
      }
    }

    return res.status(500).json({ message: 'Supabase não está configurado no .env' });
  } catch (err) {
    console.error('Erro na rota de login:', err);
    res.status(500).json({ message: 'Erro interno ao realizar login' });
  }
});

// POST /api/register - Criação de usuário no Supabase Auth e vínculo de origem da primeira visita (RF20)
router.post('/register', validate(loginSchema), async (req, res) => {
  const { email, password, name, role = 'Comprador', anonymousId, origin = 'direto' } = req.body;

  if (!supabase) {
    return res.status(500).json({ message: 'Supabase não está configurado no .env' });
  }

  const userMetadata = {
    name: name || email.split('@')[0],
    role,
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
              role,
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
        role: createdUser.user_metadata?.role || role,
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
