const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const { shareLinkSchema } = require('../schemas/peca.schema');
const {
  generateShareToken,
  generateAnonymousId,
  normalizeOrigin,
  formatPecaPassport,
  ensureFirstVisitAttribution,
  logEvent
} = require('../utils/eventLogger');
const {
  isMockActive,
  findMockItem,
  findMockItemByIdOrPassport,
  updateMockItem
} = require('../mocks/data');

/**
 * Busca uma peça pelo identificador público não enumerável (`share_token` ou `passport_id`)
 */
const findPecaByPublicIdentifier = async (identifier) => {
  // RNF11: Bloqueia tentativa de enumeração por ID numérico sequencial
  if (/^\d+$/.test(identifier)) {
    return { item: null, blockedSequential: true };
  }

  if (isMockActive(supabase)) {
    return findMockItem(identifier);
  }

  // Tenta buscar pelo `share_token` primeiro, depois pelo `passport_id`
  const { data: byToken, error: tokenErr } = await supabase
    .from('pecas')
    .select('*')
    .eq('share_token', identifier)
    .maybeSingle();

  if (!tokenErr && byToken) {
    return { item: byToken, matchedBy: 'share_token' };
  }

  const { data: byPassport, error: passportErr } = await supabase
    .from('pecas')
    .select('*')
    .eq('passport_id', identifier)
    .maybeSingle();

  if (!passportErr && byPassport) {
    return { item: byPassport, matchedBy: 'passport_id' };
  }

  return { item: null, blockedSequential: false, error: passportErr };
};

/**
 * GET /api/passaportes/:identifier
 * RF01, RF02, RF03, RF04, RF15, RF19, RF20, RNF08, RNF09, RNF11
 * Consulta pública e gratuita do Passaporte Digital por Link ou QR Code (sem exigir cadastro).
 */
router.get('/:identifier', async (req, res) => {
  const { identifier } = req.params;
  const rawOrigin = req.query.origem || req.query.origin || req.headers['x-origin'] || 'direto';
  const origin = normalizeOrigin(rawOrigin);
  const viewerUserId = req.query.userId || req.headers['x-user-id'] || null;
  const incomingAnonId = req.query.anonymousId || req.headers['x-anonymous-id'] || null;
  const anonymousId = viewerUserId ? incomingAnonId : incomingAnonId || generateAnonymousId();

  try {
    const mockMode = isMockActive(supabase);
    if (!supabase && !mockMode) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const { item, blockedSequential } = await findPecaByPublicIdentifier(identifier);

    // Critério de Aceite 3 (RNF11): link inválido, sequencial ou inexistente retorna erro compreensível sem revelar dados privados
    if (blockedSequential || !item) {
      return res.status(404).json({
        code: 'PASSPORT_NOT_FOUND',
        message: 'Passaporte não encontrado ou link inválido. Verifique o endereço ou escaneie o QR Code novamente.'
      });
    }

    // Critério de Aceite 6 (RF15): se o proprietário revogou o link ou despublicou o passaporte, exibe mensagem clara de indisponibilidade
    const isRevoked = item.share_status === 'revoked';
    const isUnpublished = item.is_published === false;

    if (isRevoked || isUnpublished) {
      return res.status(410).json({
        code: 'PASSPORT_REVOKED',
        message: 'Este link ou QR Code foi revogado pelo proprietário e o passaporte não está disponível para consulta.'
      });
    }

    // RF19 & Critério de Aceite 5: Distinção entre consulta do próprio dono vs. não dono
    const isOwner = Boolean(
      viewerUserId && item.owner_id && String(viewerUserId) === String(item.owner_id)
    );

    // RF20: Guarda a atribuição de origem da primeira visita para visitantes
    const attribution = await ensureFirstVisitAttribution({
      anonymousId,
      origin,
      passportId: item.passport_id,
      userId: viewerUserId
    });

    // RF19: Registra o evento `passaporte_consultado` com origem e flag `is_owner`
    const recordedEvent = await logEvent({
      eventName: 'passaporte_consultado',
      pecaId: item.id,
      passportId: item.passport_id,
      userId: viewerUserId,
      anonymousId,
      origin,
      isOwner,
      metadata: {
        identifier_used: identifier
      }
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const formattedPassport = formatPecaPassport(item, frontendBaseUrl);

    return res.json({
      passport: formattedPassport,
      tracking: {
        eventId: recordedEvent?.id || null,
        eventName: 'passaporte_consultado',
        origin,
        isOwner,
        anonymousId,
        firstOrigin: attribution?.first_origin || origin
      }
    });
  } catch (err) {
    console.error('Erro ao consultar passaporte público:', err);
    return res.status(500).json({
      message: 'Erro interno ao consultar o passaporte digital'
    });
  }
});

/**
 * POST /api/passaportes/:id/compartilhar
 * RF15: Gera (ou regenera) o link não enumerável com parâmetro de origem e o QR Code para download/impressão.
 * Registra o evento `link_gerado` (RF19).
 */
router.post('/:id/compartilhar', validate(shareLinkSchema), async (req, res) => {
  const { id } = req.params;
  const { origin, regenerate, userId } = req.body;

  try {
    const mockMode = isMockActive(supabase);
    if (!supabase && !mockMode) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    let item = null;

    if (mockMode) {
      item = findMockItemByIdOrPassport(id);
    } else {
      const isNumericId = /^\d+$/.test(id);
      const query = supabase.from('pecas').select('*');
      const { data, error: findError } = await (isNumericId
        ? query.eq('id', Number(id)).maybeSingle()
        : query.eq('passport_id', id).maybeSingle());
      if (!findError) item = data;
    }

    if (!item) {
      return res.status(404).json({ message: 'Peça/Passaporte não encontrado para compartilhamento' });
    }

    const currentToken = item.share_token;
    const shouldGenerateNewToken = regenerate || !currentToken || item.share_status === 'revoked';
    const nextShareToken = shouldGenerateNewToken ? generateShareToken() : currentToken;

    let updatedItem = item;

    if (mockMode) {
      updatedItem = updateMockItem(item.id, {
        share_token: nextShareToken,
        share_status: 'active',
        share_revoked_at: null,
        is_published: true
      });
    } else {
      const { data: savedItem, error: updateErr } = await supabase
        .from('pecas')
        .update({
          share_token: nextShareToken,
          share_status: 'active',
          share_revoked_at: null,
          is_published: true
        })
        .eq('id', item.id)
        .select()
        .maybeSingle();

      if (!updateErr && savedItem) {
        updatedItem = savedItem;
      } else {
        updatedItem = {
          ...item,
          share_token: nextShareToken,
          share_status: 'active',
          share_revoked_at: null
        };
      }
    }

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareIdentifier = updatedItem.share_token || updatedItem.passport_id;
    const shareOrigin = normalizeOrigin(origin || 'link_vendedor');

    const shareUrl = `${frontendBaseUrl}/passaporte/${shareIdentifier}?origem=${shareOrigin}`;
    const qrTargetUrl = `${frontendBaseUrl}/passaporte/${shareIdentifier}?origem=qr`;
    const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrTargetUrl)}`;

    await logEvent({
      eventName: 'link_gerado',
      pecaId: item.id,
      passportId: item.passport_id,
      userId: userId || item.owner_id || null,
      origin: shareOrigin,
      isOwner: true,
      metadata: {
        regenerated: Boolean(shouldGenerateNewToken),
        share_token: nextShareToken
      }
    });

    return res.json({
      message: regenerate
        ? 'Link e QR Code regenerados com sucesso. O link anterior foi invalidado.'
        : 'Link e QR Code gerados com sucesso.',
      passportId: updatedItem.passport_id,
      shareToken: nextShareToken,
      shareStatus: 'active',
      origin: shareOrigin,
      shareUrl,
      qrTargetUrl,
      qrCodeImageUrl
    });
  } catch (err) {
    console.error('Erro ao gerar link e QR Code:', err);
    return res.status(500).json({ message: 'Erro interno ao gerar link de compartilhamento' });
  }
});

/**
 * POST /api/passaportes/:id/revogar
 * RF15 & Critério de Aceite 6: Revoga o link e o QR Code da peça.
 * A abertura passa a mostrar mensagem clara de indisponibilidade.
 */
router.post('/:id/revogar', async (req, res) => {
  const { id } = req.params;
  const revokedAt = new Date().toISOString();

  try {
    const mockMode = isMockActive(supabase);
    if (!supabase && !mockMode) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    let item = null;

    if (mockMode) {
      item = findMockItemByIdOrPassport(id);
    } else {
      const isNumericId = /^\d+$/.test(id);
      const query = supabase.from('pecas').select('*');
      const { data, error: findError } = await (isNumericId
        ? query.eq('id', Number(id)).maybeSingle()
        : query.eq('passport_id', id).maybeSingle());
      if (!findError) item = data;
    }

    if (!item) {
      return res.status(404).json({ message: 'Peça/Passaporte não encontrado para revogação' });
    }

    if (mockMode) {
      updateMockItem(item.id, {
        share_status: 'revoked',
        share_revoked_at: revokedAt
      });
    } else {
      const { error: updateErr } = await supabase
        .from('pecas')
        .update({
          share_status: 'revoked',
          share_revoked_at: revokedAt
        })
        .eq('id', item.id);

      if (updateErr) {
        console.warn('[Supabase POST /passaportes/:id/revogar Warning]:', updateErr.message);
        return res.status(400).json({
          message: 'Não foi possível revogar o link no banco. Verifique se a migração SQL P0 foi executada.',
          error: updateErr.message
        });
      }
    }

    return res.json({
      message: 'Link e QR Code revogados com sucesso. O passaporte não está mais acessível pelo link público.',
      passportId: item.passport_id,
      shareStatus: 'revoked',
      shareRevokedAt: revokedAt
    });
  } catch (err) {
    console.error('Erro ao revogar link do passaporte:', err);
    return res.status(500).json({ message: 'Erro interno ao revogar link do passaporte' });
  }
});

module.exports = router;
