const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const {
  VALID_EVENTS,
  VALID_ORIGINS,
  createEventoSchema,
  attributionSchema,
  linkOriginSchema
} = require('../schemas/evento.schema');
const {
  ensureFirstVisitAttribution,
  linkFirstVisitToUser,
  logEvent,
  inMemoryEvents,
  inMemoryAttributions
} = require('../utils/eventLogger');

/**
 * GET /api/eventos/catalogo
 * Retorna o catálogo oficial de eventos (Seção 5.2 - RF19) e canais de origem (RF20)
 */
router.get('/catalogo', (req, res) => {
  res.json({
    events: VALID_EVENTS,
    origins: VALID_ORIGINS
  });
});

/**
 * GET /api/eventos
 * Lista os eventos registrados para validação e auditoria de Growth (RF19)
 */
router.get('/', async (req, res) => {
  const { eventName, passportId, origin, limit = 50 } = req.query;

  try {
    if (supabase) {
      let query = supabase
        .from('eventos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(Math.min(Number(limit) || 50, 200));

      if (eventName) query = query.eq('event_name', eventName);
      if (passportId) query = query.eq('passport_id', passportId);
      if (origin) query = query.eq('origin', origin);

      const { data, error } = await query;
      if (!error && data) {
        return res.json(data);
      }
      if (error) {
        console.warn('[Supabase GET /eventos Warning]:', error.message);
      }
    }

    // Fallback em memória
    return res.json(inMemoryEvents.slice(0, Number(limit) || 50));
  } catch (err) {
    console.error('Erro ao consultar eventos:', err);
    return res.status(500).json({ message: 'Erro interno ao consultar eventos' });
  }
});

/**
 * POST /api/eventos
 * RF19 & RNF09: Registra um evento do catálogo da Seção 5.2 com data e hora,
 * identificador do usuário ou anônimo, origem e distinção dono/não dono.
 */
router.post('/', validate(createEventoSchema), async (req, res) => {
  const { eventName, pecaId, passportId, userId, anonymousId, origin, isOwner, metadata } = req.body;

  try {
    // RF20: Se houver anonymousId, garante que a primeira visita e sua origem fiquem salvas
    if (anonymousId) {
      await ensureFirstVisitAttribution({
        anonymousId,
        origin,
        passportId,
        userId
      });
    }

    const eventRecord = await logEvent({
      eventName,
      pecaId,
      passportId,
      userId,
      anonymousId,
      origin,
      isOwner,
      metadata
    });

    return res.status(201).json(eventRecord);
  } catch (err) {
    console.error('Erro ao registrar evento:', err);
    return res.status(500).json({ message: 'Erro interno ao registrar evento' });
  }
});

/**
 * POST /api/eventos/atribuicao
 * RF20: Guarda explicitamente o canal da primeira visita de um visitante anônimo
 */
router.post('/atribuicao', validate(attributionSchema), async (req, res) => {
  const { anonymousId, origin, passportId } = req.body;

  try {
    const attribution = await ensureFirstVisitAttribution({
      anonymousId,
      origin,
      passportId
    });

    return res.status(201).json({
      message: 'Origem da primeira visita registrada',
      attribution
    });
  } catch (err) {
    console.error('Erro ao registrar atribuição de origem:', err);
    return res.status(500).json({ message: 'Erro interno ao registrar atribuição de origem' });
  }
});

/**
 * POST /api/eventos/vincular-origem
 * RF20: Liga o canal da primeira visita (anonymousId) ao cadastro posterior do usuário (userId)
 */
router.post('/vincular-origem', validate(linkOriginSchema), async (req, res) => {
  const { anonymousId, userId } = req.body;

  try {
    const linked = await linkFirstVisitToUser({ anonymousId, userId });
    return res.json({
      message: 'Origem da primeira visita vinculada ao usuário com sucesso',
      attribution: linked
    });
  } catch (err) {
    console.error('Erro ao vincular origem ao usuário:', err);
    return res.status(500).json({ message: 'Erro interno ao vincular origem ao usuário' });
  }
});

/**
 * GET /api/eventos/atribuicoes
 * Lista atribuições de origem registradas (para inspeção de RF20)
 */
router.get('/atribuicoes', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('atribuicoes_origem')
        .select('*')
        .order('first_visit_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        return res.json(data);
      }
    }

    return res.json(Array.from(inMemoryAttributions.values()));
  } catch (err) {
    console.error('Erro ao listar atribuições:', err);
    return res.status(500).json({ message: 'Erro interno ao listar atribuições' });
  }
});

module.exports = router;

