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
    // Se Supabase estiver conectado, tenta autenticar no Supabase Auth
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
            role: data.user.user_metadata?.role || 'Vendedor',
            firstOrigin: attribution?.first_origin || data.user.user_metadata?.first_origin || null
          }
        });
      }

      console.warn('[Supabase Auth Warning]:', error?.message);
    }

    // Modo fallback de desenvolvimento (para testes locais rápidos)
    const mockUserId = '1';
    let attribution = null;
    if (anonymousId) {
      attribution = await linkFirstVisitToUser({
        anonymousId,
        userId: mockUserId,
        fallbackOrigin: origin
      });
    }

    await logEvent({
      eventName: 'sessao_iniciada',
      userId: mockUserId,
      anonymousId,
      origin,
      isOwner: false
    });

    return res.json({
      token: 'mock-jwt-token-luxury-curation',
      user: {
        id: mockUserId,
        name: email.split('@')[0].toUpperCase(),
        email: email,
        role: 'Vendedor',
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

  if (!supabase) {
    return res.status(400).json({ message: 'Supabase não está configurado no .env' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
          role,
          anonymous_id: anonymousId || null,
          initial_origin: origin
        }
      }
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    // RF20: Liga o canal da primeira visita ao novo usuário cadastrado
    let attribution = null;
    if (anonymousId && data?.user?.id) {
      attribution = await linkFirstVisitToUser({
        anonymousId,
        userId: data.user.id,
        fallbackOrigin: origin
      });
    }

    res.status(201).json({
      message: 'Usuário registrado com sucesso!',
      user: data.user,
      attribution
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ message: 'Erro interno ao cadastrar usuário' });
  }
});

module.exports = router;
