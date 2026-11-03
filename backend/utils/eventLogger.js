const crypto = require('crypto');
const supabase = require('../config/supabase');
const { VALID_ORIGINS } = require('../schemas/evento.schema');

// Buffers em memória como fallback caso o banco ainda não tenha rodado a migração SQL
const inMemoryEvents = [];
const inMemoryAttributions = new Map();

/**
 * RNF11: Gera identificador não enumerável para o passaporte (ex: LST-9F4A2C8E1B0D)
 */
const generatePassportId = () => {
  return `LST-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
};

/**
 * RF15 & RNF11: Gera token criptográfico não sequencial para Link e QR Code
 */
const generateShareToken = () => {
  return crypto.randomBytes(12).toString('hex');
};

/**
 * RNF09: Gera identificador anônimo para visitante sem conta (LGPD)
 */
const generateAnonymousId = () => {
  return `anon_${crypto.randomBytes(8).toString('hex')}`;
};

/**
 * RF20: Normaliza o parâmetro de origem para um dos valores canônicos do DRE v2.0
 */
const normalizeOrigin = (rawOrigin) => {
  if (!rawOrigin || typeof rawOrigin !== 'string') return 'direto';
  const cleaned = rawOrigin.trim().toLowerCase();
  if (VALID_ORIGINS.includes(cleaned)) return cleaned;
  // Aliases comuns em URLs (ex: ?origem=link -> link_compartilhado, ?origem=vendedor -> link_vendedor)
  if (cleaned === 'vendedor') return 'link_vendedor';
  if (cleaned === 'link' || cleaned === 'compartilhado') return 'link_compartilhado';
  if (cleaned === 'qrcode' || cleaned === 'qr_code') return 'qr';
  return 'direto';
};

/**
 * RF03 (Critério de Aceite 4):
 * "Dado um campo sem informação, então o sistema mostra 'Não informado' em vez de inferir."
 */
const nonInferredField = (val) => {
  if (val === undefined || val === null) return 'Não informado';
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'pendente' || str.toLowerCase() === 'null') {
    return 'Não informado';
  }
  return str;
};

/**
 * Formata uma peça/passaporte garantindo todos os campos essenciais do P0 (RF03, RF15, RNF08)
 */
const formatPecaPassport = (item, baseUrl = 'http://localhost:5173') => {
  const passportId = item.passport_id || item.passportId || 'Não informado';
  const shareToken = item.share_token || item.shareToken || null;
  const shareStatus = item.share_status || item.shareStatus || 'active';
  const history = Array.isArray(item.history) ? item.history : [];

  const shareIdentifier = shareToken || passportId;
  const shareUrlVendedor = `${baseUrl}/passaporte/${shareIdentifier}?origem=link_vendedor`;
  const shareUrlCompartilhado = `${baseUrl}/passaporte/${shareIdentifier}?origem=link_compartilhado`;
  const qrTargetUrl = `${baseUrl}/passaporte/${shareIdentifier}?origem=qr`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrTargetUrl)}`;

  return {
    id: item.id,
    name: nonInferredField(item.name),
    category: nonInferredField(item.category),
    price: item.price ?? 0,
    description: nonInferredField(item.description),
    image: item.image || '',
    status: item.status || 'em revisão',
    ownerId: item.owner_id || item.ownerId || null,
    isPublished: item.is_published !== undefined ? item.is_published : true,

    // RF03: Informações essenciais em uma tela (procedência, estado de conservação e histórico)
    passportId,
    provenance: nonInferredField(item.provenance),
    conservationState: nonInferredField(item.conservation_state || item.conservationState),
    conservationScore: item.conservation_score ?? item.conservationScore ?? null,
    history,
    historyStatus: history.length > 0 ? 'Informado' : 'Não informado',
    expertName: nonInferredField(item.expert_name || item.expertName),
    expertDate: nonInferredField(item.expert_date || item.expertDate),

    // RF15: Dados de Link e QR Code
    shareToken,
    shareStatus,
    shareRevokedAt: item.share_revoked_at || item.shareRevokedAt || null,
    sharing: {
      active: shareStatus === 'active',
      shareUrl: shareUrlVendedor,
      shareUrlPublic: shareUrlCompartilhado,
      qrTargetUrl,
      qrCodeImageUrl
    }
  };
};

/**
 * RF20: Guarda o canal da primeira visita de um visitante (anonymousId)
 */
const ensureFirstVisitAttribution = async ({ anonymousId, origin = 'direto', passportId = null, userId = null }) => {
  if (!anonymousId) return null;
  const normalizedOrigin = normalizeOrigin(origin);

  try {
    if (supabase) {
      const { data: existing, error: selectErr } = await supabase
        .from('atribuicoes_origem')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .maybeSingle();

      if (!selectErr) {
        if (existing) {
          return existing;
        }

        const payload = {
          anonymous_id: anonymousId,
          first_origin: normalizedOrigin,
          first_passport_id: passportId || null,
          user_id: userId || null,
          linked_at: userId ? new Date().toISOString() : null
        };

        const { data: created, error: insertErr } = await supabase
          .from('atribuicoes_origem')
          .insert([payload])
          .select()
          .single();

        if (!insertErr && created) {
          // Registra também o evento `primeira_visita` no catálogo (RF19)
          await logEvent({
            eventName: 'primeira_visita',
            passportId,
            userId,
            anonymousId,
            origin: normalizedOrigin,
            isOwner: false,
            metadata: { first_origin: normalizedOrigin }
          });
          return created;
        }
      }
    }
  } catch (err) {
    console.warn('[RF20 Attribution Fallback]:', err.message);
  }

  // Fallback em memória
  if (!inMemoryAttributions.has(anonymousId)) {
    const record = {
      id: crypto.randomUUID(),
      anonymous_id: anonymousId,
      first_origin: normalizedOrigin,
      first_passport_id: passportId || null,
      first_visit_at: new Date().toISOString(),
      user_id: userId || null,
      linked_at: userId ? new Date().toISOString() : null
    };
    inMemoryAttributions.set(anonymousId, record);
    await logEvent({
      eventName: 'primeira_visita',
      passportId,
      userId,
      anonymousId,
      origin: normalizedOrigin,
      isOwner: false,
      metadata: { first_origin: normalizedOrigin }
    });
  }

  return inMemoryAttributions.get(anonymousId);
};

/**
 * RF20: Liga a origem da primeira visita ao cadastro posterior do usuário
 */
const linkFirstVisitToUser = async ({ anonymousId, userId, fallbackOrigin = 'direto' }) => {
  if (!anonymousId || !userId) return null;
  const nowIso = new Date().toISOString();

  try {
    if (supabase) {
      const { data: existing, error: selectErr } = await supabase
        .from('atribuicoes_origem')
        .select('*')
        .eq('anonymous_id', anonymousId)
        .maybeSingle();

      if (!selectErr) {
        if (existing) {
          const { data: updated, error: updateErr } = await supabase
            .from('atribuicoes_origem')
            .update({
              user_id: String(userId),
              linked_at: existing.linked_at || nowIso
            })
            .eq('anonymous_id', anonymousId)
            .select()
            .single();

          if (!updateErr) return updated;
        } else {
          // Caso o usuário se cadastre direto na primeira visita
          const { data: created, error: insertErr } = await supabase
            .from('atribuicoes_origem')
            .insert([
              {
                anonymous_id: anonymousId,
                first_origin: normalizeOrigin(fallbackOrigin),
                user_id: String(userId),
                linked_at: nowIso
              }
            ])
            .select()
            .single();

          if (!insertErr) return created;
        }
      }
    }
  } catch (err) {
    console.warn('[RF20 Link Attribution Warning]:', err.message);
  }

  // Fallback em memória
  const existingMem = inMemoryAttributions.get(anonymousId);
  if (existingMem) {
    existingMem.user_id = String(userId);
    existingMem.linked_at = existingMem.linked_at || nowIso;
    return existingMem;
  }

  const newMem = {
    id: crypto.randomUUID(),
    anonymous_id: anonymousId,
    first_origin: normalizeOrigin(fallbackOrigin),
    first_passport_id: null,
    first_visit_at: nowIso,
    user_id: String(userId),
    linked_at: nowIso
  };
  inMemoryAttributions.set(anonymousId, newMem);
  return newMem;
};

/**
 * RF19 & RNF09: Registra evento do catálogo da Seção 5.2 com data/hora, user_id ou anonymous_id, origem e is_owner
 */
const logEvent = async ({
  eventName,
  pecaId = null,
  passportId = null,
  userId = null,
  anonymousId = null,
  origin = 'direto',
  isOwner = false,
  metadata = {}
}) => {
  const normalizedOrigin = normalizeOrigin(origin);
  const effectiveAnonymousId = !userId && !anonymousId ? generateAnonymousId() : anonymousId || null;

  const eventPayload = {
    event_name: eventName,
    peca_id: pecaId ?? null,
    passport_id: passportId || null,
    user_id: userId ? String(userId) : null,
    anonymous_id: effectiveAnonymousId,
    origin: normalizedOrigin,
    is_owner: Boolean(isOwner),
    metadata: metadata || {}
  };

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('eventos')
        .insert([eventPayload])
        .select()
        .single();

      if (!error && data) {
        return data;
      }

      if (error) {
        console.warn(`[RF19 Event Log Warning - ${eventName}]:`, error.message);
      }
    }
  } catch (err) {
    console.warn(`[RF19 Event Log Error - ${eventName}]:`, err.message);
  }

  // Fallback em memória caso a tabela `eventos` ainda não tenha sido criada no Supabase
  const fallbackRecord = {
    id: crypto.randomUUID(),
    ...eventPayload,
    created_at: new Date().toISOString()
  };
  inMemoryEvents.unshift(fallbackRecord);
  return fallbackRecord;
};

module.exports = {
  generatePassportId,
  generateShareToken,
  generateAnonymousId,
  normalizeOrigin,
  nonInferredField,
  formatPecaPassport,
  ensureFirstVisitAttribution,
  linkFirstVisitToUser,
  logEvent,
  inMemoryEvents,
  inMemoryAttributions
};

