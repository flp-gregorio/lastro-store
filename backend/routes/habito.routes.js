const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const {
  registrarRespostaConviteSchema,
  notificarLaudoConcluidoSchema
} = require('../schemas/habito.schema');
const { logEvent, inMemoryEvents } = require('../utils/eventLogger');
const {
  dispatchNotification,
  listUserNotifications,
  inMemoryListas,
  inMemoryItensLista,
  inMemoryLembretes
} = require('../utils/notificationHelper');

const normalizeCat = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const areCategoriesCompatible = (catA, catB) => {
  const a = normalizeCat(catA);
  const b = normalizeCat(catB);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  // "Arte" e "Obras de Arte" são equivalentes
  if ((a.includes('arte') && b.includes('arte'))) return true;
  return false;
};

/**
 * Busca uma peça real do banco que seja compatível com a Lista de Desejos do usuário
 */
const findCompatiblePecaForUser = async (userId) => {
  if (!supabase) return null;

  try {
    const { data: allPecas } = await supabase
      .from('pecas')
      .select('id, name, category, passport_id, share_token, status, is_published')
      .order('id', { ascending: true });

    if (!allPecas || allPecas.length === 0) return null;

    // 1. Descobre quais peças o usuário já salvou na Lista de Desejos (Supabase + fallback em memória)
    const savedPecaIds = new Set();

    const { data: listas } = await supabase
      .from('listas_desejos')
      .select('id')
      .eq('user_id', String(userId));

    if (listas && listas.length > 0) {
      const listaIds = listas.map((l) => l.id);
      const { data: itens } = await supabase
        .from('itens_lista')
        .select('peca_id')
        .in('lista_id', listaIds);

      (itens || []).forEach((i) => {
        if (i.peca_id) savedPecaIds.add(Number(i.peca_id));
      });
    }

    // Inclui também eventuais listas em memória
    const memListaIds = inMemoryListas
      .filter((l) => String(l.user_id) === String(userId))
      .map((l) => String(l.id));

    inMemoryItensLista
      .filter((i) => memListaIds.includes(String(i.lista_id)))
      .forEach((i) => {
        if (i.peca_id) savedPecaIds.add(Number(i.peca_id));
      });

    // 2. Identifica as categorias das peças que o usuário salvou
    const savedPecas = allPecas.filter((p) => savedPecaIds.has(Number(p.id)));
    const favoriteCategories = savedPecas.map((p) => p.category).filter(Boolean);

    // Verifica peças já notificadas anteriormente para alternar recomendações quando houver mais de uma
    const existingNotifs = await listUserNotifications({ userId, limit: 30 });
    const alreadyNotifiedPecaIds = new Set(
      (existingNotifs || [])
        .filter((n) => n.tipo === 'peca_compatível' && n.peca_id)
        .map((n) => Number(n.peca_id))
    );

    if (favoriteCategories.length > 0) {
      // Todas as peças compatíveis que AINDA NÃO estão na lista de desejos do usuário
      const newCompatibleCandidates = allPecas.filter(
        (p) =>
          !savedPecaIds.has(Number(p.id)) &&
          favoriteCategories.some((favCat) => areCategoriesCompatible(p.category, favCat))
      );

      if (newCompatibleCandidates.length > 0) {
        // Prioriza uma peça compatível que ainda não tenha sido notificada (alterna entre categorias/peças)
        const unnotifiedCandidate =
          newCompatibleCandidates.find((p) => !alreadyNotifiedPecaIds.has(Number(p.id))) ||
          newCompatibleCandidates[Math.floor(Math.random() * newCompatibleCandidates.length)];

        return { peca: unnotifiedCandidate, matchedFromWishlist: true, allCategorySaved: false };
      }

      // Caso o usuário já tenha adicionado TODOS os itens daquela categoria existentes no banco
      const sameCategoryCandidates = allPecas.filter((p) =>
        favoriteCategories.some((favCat) => areCategoriesCompatible(p.category, favCat))
      );

      if (sameCategoryCandidates.length > 0) {
        const chosen =
          sameCategoryCandidates.find((p) => !alreadyNotifiedPecaIds.has(Number(p.id))) ||
          sameCategoryCandidates[0];
        return { peca: chosen, matchedFromWishlist: true, allCategorySaved: true };
      }
    }

    // 3. Fallback caso o usuário ainda não tenha nenhuma peça na Lista de Desejos
    return { peca: allPecas[0], matchedFromWishlist: false, allCategorySaved: false };
  } catch (err) {
    console.warn('[findCompatiblePecaForUser Warning]:', err.message);
    return null;
  }
};

// POST /api/habito/convite-primeiro-investimento - Registra resposta ao convite
router.post('/convite-primeiro-investimento', validate(registrarRespostaConviteSchema), async (req, res) => {
  const { aceito, acao, passportId, pecaId, userId, anonymousId } = req.body;

  try {
    const userOrAnon = userId || anonymousId;
    if (!userOrAnon) {
      return res.status(400).json({ message: 'userId ou anonymousId é obrigatório' });
    }

    if (aceito) {
      const acaoLabels = {
        salvar_peca: 'Salvar peça na lista de desejos',
        criar_lista: 'Criar lista de desejos',
        registrar_peca_propria: 'Registrar peça própria no acervo'
      };
      await dispatchNotification({
        userId: userOrAnon,
        tipo: 'primeiro_investimento',
        titulo: 'Primeiro investimento registrado na Lastro',
        mensagem: `Acompanhamento iniciado: ${acaoLabels[acao] || acao || 'Investimento inicial'}. Agora você pode configurar alertas ou lembretes quando desejar.`,
        pecaId: pecaId || null,
        passportId: passportId || null,
        acaoUrl: passportId ? `/passaporte/${passportId}?origem=alerta` : '/notificacoes',
        respectPreferences: false
      });
    }

    const eventMap = {
      salvar_peca: 'peca_salva',
      criar_lista: 'lista_criada',
      registrar_peca_propria: 'peca_registrada'
    };
    const resolvedEvent = aceito ? eventMap[acao] || 'peca_salva' : 'sessao_iniciada';

    await logEvent({
      eventName: resolvedEvent,
      pecaId,
      passportId,
      userId,
      anonymousId,
      origin: 'direto',
      isOwner: Boolean(userId),
      metadata: {
        acao: 'resposta_convite_primeiro_investimento',
        aceito,
        acaoEscolhida: acao || 'dispensar'
      }
    });

    res.json({
      message: aceito
        ? 'Primeiro investimento registrado com sucesso.'
        : 'Convite dispensado.',
      aceito,
      acao: aceito ? acao : null
    });
  } catch (err) {
    console.error('Erro inesperado ao processar convite:', err);
    res.status(500).json({ message: 'Erro interno ao processar convite de primeiro investimento' });
  }
});

// POST /api/habito/alerta-peca-compativel - Dispara alerta de peça compatível com a Lista de Desejos do usuário
router.post('/alerta-peca-compativel', async (req, res) => {
  const { userId, pecaId: explicitPecaId, passportId: explicitPassportId, titulo, mensagem, acaoUrl } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    let targetPecaId = explicitPecaId || null;
    let targetPassportId = explicitPassportId || null;
    let targetActionUrl = acaoUrl || null;
    let targetTitulo = titulo || null;
    let targetMensagem = mensagem || null;

    // Se não foi forçada uma peça específica, busca automaticamente uma peça da mesma categoria que o usuário favoritou
    if (!targetPecaId) {
      const matchResult = await findCompatiblePecaForUser(userId);
      if (matchResult && matchResult.peca) {
        const matched = matchResult.peca;
        targetPecaId = matched.id;
        targetPassportId = matched.passport_id;
        const identifier = matched.share_token || matched.passport_id;
        targetActionUrl = `/passaporte/${identifier}?origem=alerta`;
        targetTitulo = `Nova peça de ${matched.category} compatível com sua Lista de Desejos`;
        targetMensagem = matchResult.matchedFromWishlist
          ? `A peça "${matched.name}" (${matched.category}) foi selecionada pela curadoria Lastro por combinar com a categoria dos itens salvos na sua Lista de Desejos.`
          : `A peça "${matched.name}" (${matched.category}) está disponível com Passaporte Digital verificado na curadoria Lastro.`;
      }
    }

    const result = await dispatchNotification({
      userId,
      tipo: 'peca_compatível',
      titulo: targetTitulo || 'Nova peça compatível com sua lista de desejos',
      mensagem:
        targetMensagem ||
        'Uma nova peça verificada pela curadoria Lastro combina com os itens salvos na sua Lista de Desejos.',
      pecaId: targetPecaId,
      passportId: targetPassportId,
      acaoUrl: targetActionUrl || (targetPassportId ? `/passaporte/${targetPassportId}?origem=alerta` : '/catalogo'),
      respectPreferences: true
    });

    if (!result.sent) {
      return res.json({
        enviado: false,
        blockedByPreferences: true,
        message: result.reason
      });
    }

    await logEvent({
      eventName: 'alerta_configurado',
      pecaId: targetPecaId,
      passportId: targetPassportId,
      userId,
      origin: 'alerta',
      isOwner: false,
      metadata: { acao: 'alerta_peca_compativel_enviado', notificacaoId: result.notificacao.id }
    });

    res.status(201).json({
      enviado: true,
      message: 'Alerta de peça compatível enviado com sucesso',
      notificacao: result.notificacao
    });
  } catch (err) {
    console.error('Erro inesperado ao enviar alerta de peça compatível:', err);
    res.status(500).json({ message: 'Erro interno ao enviar alerta de peça compatível' });
  }
});

// POST /api/habito/aviso-laudo-concluido - Notifica laudo concluído
router.post('/aviso-laudo-concluido', validate(notificarLaudoConcluidoSchema), async (req, res) => {
  const { pecaId, passportId, usuarioId, tipo } = req.body;

  try {
    let targetPecaId = pecaId || null;
    let targetPassportId = passportId || null;
    let targetPecaName = null;
    let targetShareToken = null;

    if (supabase) {
      if (targetPecaId) {
        const { data: found } = await supabase
          .from('pecas')
          .select('id, name, passport_id, share_token')
          .eq('id', targetPecaId)
          .maybeSingle();
        if (found) {
          targetPecaName = found.name;
          targetPassportId = found.passport_id;
          targetShareToken = found.share_token;
        }
      } else {
        // Busca a última peça cadastrada pelo usuário (ou uma peça do acervo)
        const { data: userPeca } = await supabase
          .from('pecas')
          .select('id, name, passport_id, share_token')
          .eq('owner_id', String(usuarioId))
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        const chosen =
          userPeca ||
          (
            await supabase
              .from('pecas')
              .select('id, name, passport_id, share_token')
              .order('id', { ascending: false })
              .limit(1)
              .maybeSingle()
          ).data;

        if (chosen) {
          targetPecaId = chosen.id;
          targetPecaName = chosen.name;
          targetPassportId = chosen.passport_id;
          targetShareToken = chosen.share_token;
        }
      }
    }

    const identifier = targetShareToken || targetPassportId;

    const result = await dispatchNotification({
      userId: usuarioId,
      tipo: 'laudo_concluido',
      titulo: targetPecaName
        ? `Laudo concluído: ${targetPecaName}`
        : 'Laudo pericial concluído — Passaporte emitido',
      mensagem: targetPecaName
        ? `O perito credenciado assinou o laudo da peça "${targetPecaName}" (${targetPassportId}). O Passaporte Digital emitido já está disponível para consulta.`
        : 'O perito credenciado assinou o laudo da sua peça. O Passaporte Digital emitido já está disponível para consulta.',
      pecaId: targetPecaId,
      passportId: targetPassportId,
      acaoUrl: identifier ? `/passaporte/${identifier}?origem=alerta` : targetPecaId ? `/peca/${targetPecaId}` : '/catalogo',
      respectPreferences: true
    });

    if (!result.sent) {
      return res.json({
        enviado: false,
        blockedByPreferences: true,
        message: result.reason
      });
    }

    await logEvent({
      eventName: 'passaporte_publicado',
      pecaId: targetPecaId,
      passportId: targetPassportId,
      userId: usuarioId,
      origin: 'alerta',
      isOwner: tipo === 'dono',
      metadata: { acao: 'aviso_laudo_concluido', tipoNotificacao: tipo, notificacaoId: result.notificacao.id }
    });

    res.status(201).json({
      enviado: true,
      message: 'Aviso de laudo concluído enviado com sucesso',
      notificacao: result.notificacao
    });
  } catch (err) {
    console.error('Erro inesperado ao enviar aviso de laudo:', err);
    res.status(500).json({ message: 'Erro interno ao enviar aviso de laudo concluído' });
  }
});

// POST /api/habito/lembrete-conservacao - Dispara notificação de lembrete de conservação
router.post('/lembrete-conservacao', async (req, res) => {
  const { userId, pecaId, passportId, frequencia = 'semestral', titulo, mensagem } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    let targetPecaId = pecaId || null;
    let targetPassportId = passportId || null;
    let targetShareToken = null;
    let targetPecaName = null;
    let targetFreq = frequencia;

    if (supabase && !targetPecaId) {
      // Verifica se o usuário tem algum lembrete configurado em `lembretes_conservacao`
      const { data: userLembrete } = await supabase
        .from('lembretes_conservacao')
        .select('peca_id, frequencia')
        .eq('owner_id', String(userId))
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userLembrete && userLembrete.peca_id) {
        targetPecaId = userLembrete.peca_id;
        targetFreq = userLembrete.frequencia || targetFreq;
      } else {
        const memLembrete = inMemoryLembretes.find(
          (l) => String(l.owner_id) === String(userId) && l.ativo
        );
        if (memLembrete && memLembrete.peca_id) {
          targetPecaId = memLembrete.peca_id;
          targetFreq = memLembrete.frequencia || targetFreq;
        }
      }
    }

    if (supabase) {
      const query = supabase.from('pecas').select('id, name, passport_id, share_token');
      const { data: foundPeca } = await (targetPecaId
        ? query.eq('id', targetPecaId).maybeSingle()
        : query.order('id', { ascending: true }).limit(1).maybeSingle());

      if (foundPeca) {
        targetPecaId = foundPeca.id;
        targetPecaName = foundPeca.name;
        targetPassportId = foundPeca.passport_id;
        targetShareToken = foundPeca.share_token;
      }
    }

    const identifier = targetShareToken || targetPassportId;

    const result = await dispatchNotification({
      userId,
      tipo: 'lembrete_conservacao',
      titulo:
        titulo ||
        (targetPecaName
          ? `Lembrete ${targetFreq} de conservação: ${targetPecaName}`
          : `Lembrete ${targetFreq} de conservação do acervo`),
      mensagem:
        mensagem ||
        (targetPecaName
          ? `Chegou o momento da revisão ${targetFreq} da peça "${targetPecaName}". Atualize o estado de conservação e o histórico no Passaporte Digital.`
          : 'Chegou o momento de revisar o estado de conservação e atualizar o histórico de manutenção da sua peça no Passaporte Digital.'),
      pecaId: targetPecaId,
      passportId: targetPassportId,
      acaoUrl: identifier ? `/passaporte/${identifier}?origem=alerta` : '/lembretes',
      respectPreferences: true
    });

    if (!result.sent) {
      return res.json({
        enviado: false,
        blockedByPreferences: true,
        message: result.reason
      });
    }

    res.status(201).json({
      enviado: true,
      message: 'Lembrete de conservação enviado com sucesso',
      notificacao: result.notificacao
    });
  } catch (err) {
    console.error('Erro ao disparar lembrete de conservação:', err);
    res.status(500).json({ message: 'Erro interno ao disparar lembrete de conservação' });
  }
});

// GET /api/habito/primeiro-investimento/status - Verifica primeiro investimento
router.get('/primeiro-investimento/status', async (req, res) => {
  const { userId, anonymousId } = req.query;
  const targetUser = userId || anonymousId;

  try {
    if (!targetUser) {
      return res.status(400).json({ message: 'userId ou anonymousId é obrigatório' });
    }

    const investEvents = ['peca_salva', 'lista_criada', 'peca_registrada', 'peca_cadastrada'];

    if (supabase) {
      const column = userId ? 'user_id' : 'anonymous_id';
      const { data: eventos, error } = await supabase
        .from('eventos')
        .select('event_name, created_at')
        .eq(column, targetUser)
        .in('event_name', investEvents)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!error && eventos && eventos.length > 0) {
        return res.json({
          userId: targetUser,
          primeiroInvestimentoFeito: true,
          primeiroEvento: eventos[0].event_name,
          dataPrimeiroInvestimento: eventos[0].created_at
        });
      }
    }

    const memMatch = inMemoryEvents.find(
      (e) =>
        (e.user_id === targetUser || e.anonymous_id === targetUser) &&
        investEvents.includes(e.event_name)
    );

    res.json({
      userId: targetUser,
      primeiroInvestimentoFeito: Boolean(memMatch),
      primeiroEvento: memMatch ? memMatch.event_name : null,
      dataPrimeiroInvestimento: memMatch ? memMatch.created_at : null
    });
  } catch (err) {
    console.error('Erro inesperado ao verificar primeiro investimento:', err);
    res.status(500).json({ message: 'Erro interno ao verificar status do primeiro investimento' });
  }
});

module.exports = router;
