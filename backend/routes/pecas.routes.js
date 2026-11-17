const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const { createPecaSchema } = require('../schemas/peca.schema');
const {
  generatePassportId,
  generateShareToken,
  nonInferredField,
  formatPecaPassport,
  logEvent
} = require('../utils/eventLogger');
const { dispatchNotification, notifyCompatibleWishlistsForNewPeca } = require('../utils/notificationHelper');
const { getUsersTrackingCategory } = require('./categorias-rastreadas.routes');
const { requireStoreRole } = require('../middlewares/auth');

const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// Cache local em memória para fallback e reflexo imediato de atualizações recentes
const localPecas = [];

const hydratePecasWithCurationEvents = async (pecasList) => {
  if (!supabase || !Array.isArray(pecasList) || pecasList.length === 0) return pecasList;
  const pendingIds = pecasList
    .filter((p) => p && p.id != null && String(p.status || '').toUpperCase() !== 'APPROVED')
    .map((p) => Number(p.id))
    .filter((n) => Number.isFinite(n));

  if (pendingIds.length === 0) return pecasList;

  try {
    const { data, error } = await supabase
      .from('eventos')
      .select('peca_id, metadata, created_at')
      .eq('event_name', 'curadoria_decidida')
      .in('peca_id', pendingIds)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data) || data.length === 0) return pecasList;

    const latestByPeca = new Map();
    for (const evt of data) {
      const key = String(evt.peca_id);
      if (!latestByPeca.has(key) && evt.metadata?.status) {
        latestByPeca.set(key, evt);
      }
    }

    return pecasList.map((p) => {
      const evt = latestByPeca.get(String(p.id));
      if (!evt || String(p.status || '').toUpperCase() === 'APPROVED') return p;
      const meta = evt.metadata || {};
      const expertName = meta.expert || p.expert_name;
      const expertDate =
        meta.expertDate ||
        (evt.created_at ? new Date(evt.created_at).toLocaleDateString('pt-BR') : p.expert_date);
      return {
        ...p,
        status: meta.status,
        expert_name: expertName,
        expert_date: expertDate,
        history:
          Array.isArray(p.history) && p.history.length > 0
            ? p.history
            : [
                {
                  date: String(new Date(evt.created_at || Date.now()).getFullYear()),
                  title: 'Aprovação de Curadoria e Emissão de Passaporte',
                  details: 'Dossiê técnico e originalidade verificados pela equipe credenciada da Lastro.',
                  verifiedBy: expertName
                }
              ]
      };
    });
  } catch (err) {
    console.warn('[Curation Event Hydration Warning]:', err.message);
    return pecasList;
  }
};

// GET /api/pecas - Listar todas as peças (Supabase + fallback em memória)
router.get('/', async (req, res) => {
  try {
    if (!supabase && localPecas.length === 0) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    let pieces = [];

    if (supabase) {
      const { data, error } = await supabase
        .from('pecas')
        .select('*')
        .order('id', { ascending: false });

      if (!error && Array.isArray(data)) {
        pieces = data;
      } else if (error) {
        console.error('[Supabase GET /pecas Error]:', error.message);
        if (localPecas.length === 0) {
          return res.status(500).json({ message: 'Erro ao consultar peças', error: error.message });
        }
      }
    }

    const map = new Map();
    for (const p of pieces) {
      map.set(String(p.id), p);
    }
    for (const p of localPecas) {
      if (map.has(String(p.id))) {
        map.set(String(p.id), { ...map.get(String(p.id)), ...p });
      } else {
        map.set(String(p.id), p);
      }
    }

    const all = await hydratePecasWithCurationEvents(
      Array.from(map.values()).sort((a, b) => Number(b.id) - Number(a.id))
    );
    const baseUrl = getFrontendBaseUrl();
    res.json(all.map((item) => formatPecaPassport(item, baseUrl)));
  } catch (err) {
    console.error('Erro inesperado ao listar peças:', err);
    res.status(500).json({ message: 'Erro interno ao consultar peças' });
  }
});

// GET /api/pecas/:id - Buscar peça específica (por id, passport_id ou share_token) no Supabase e fallback local
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    if (!supabase && localPecas.length === 0) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const isNumeric = /^\d+$/.test(id);
    let data = null;
    let error = null;

    if (supabase) {
      if (isNumeric) {
        const result = await supabase
          .from('pecas')
          .select('*')
          .eq('id', Number(id))
          .maybeSingle();
        data = result.data;
        error = result.error;
      } else {
        const byPassport = await supabase
          .from('pecas')
          .select('*')
          .eq('passport_id', id)
          .maybeSingle();
        data = byPassport.data;
        error = byPassport.error;

        if (!data && !error) {
          const byToken = await supabase
            .from('pecas')
            .select('*')
            .eq('share_token', id)
            .maybeSingle();
          data = byToken.data;
        }
      }
    }

    if (data) {
      const localUpdated = localPecas.find(
        (p) => String(p.id) === String(data.id) || p.passport_id === data.passport_id
      );
      if (localUpdated) {
        data = { ...data, ...localUpdated };
      }
    } else {
      data = localPecas.find(
        (p) =>
          String(p.id) === String(id) ||
          p.passport_id === id ||
          p.share_token === id
      );
    }

    if (error && !data) {
      console.error('[Supabase GET /pecas/:id Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao buscar peça', error: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: 'Peça não encontrada' });
    }

    const [hydrated] = await hydratePecasWithCurationEvents([data]);
    res.json(formatPecaPassport(hydrated, getFrontendBaseUrl()));
  } catch (err) {
    console.error('Erro inesperado ao buscar peça:', err);
    res.status(500).json({ message: 'Erro interno ao buscar peça' });
  }
});

// POST /api/pecas - Cadastrar nova peça com validação Zod, notificação a rastreadores e compatibilidade com Wishlist
router.post('/', validate(createPecaSchema), async (req, res) => {
  const {
    name,
    category,
    price,
    description,
    image,
    ownerId,
    provenance,
    conservationState,
    conservationScore,
    history,
    expertName,
    expertDate,
    isPublished
  } = req.body;

  // RNF11: Identificadores não enumeráveis
  const generatedPassportId = generatePassportId();
  const generatedShareToken = generateShareToken();
  const initialStatus = req.body.status || 'UNDER_VALIDATION';

  // RF03: Campos sem informação ficam como 'Não informado' sem inferência
  const fullPecaPayload = {
    name,
    category,
    price: price ?? 0,
    description: description || '',
    image: image || 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000&auto=format&fit=crop',
    status: initialStatus,
    passport_id: generatedPassportId,
    expert_name: nonInferredField(expertName || 'Aguardando Curadoria'),
    expert_date: nonInferredField(expertDate || 'Pendente'),
    owner_id: ownerId || null,
    provenance: nonInferredField(provenance),
    conservation_state: nonInferredField(conservationState),
    conservation_score: conservationScore ?? null,
    history: Array.isArray(history) && history.length > 0 ? history : [
      {
        date: String(new Date().getFullYear()),
        title: 'Submissão de Dossiê para Curadoria',
        details: 'Peça submetida pelo proprietário para conferência documental e perícia técnica.',
        verifiedBy: 'Triagem Lastro'
      }
    ],
    share_token: generatedShareToken,
    share_status: 'active',
    is_published: isPublished !== undefined ? isPublished : true
  };

  try {
    let createdPiece = null;

    if (supabase) {
      let { data, error } = await supabase
        .from('pecas')
        .insert([fullPecaPayload])
        .select()
        .single();

      if (error && error.message && error.message.includes('column')) {
        console.warn('[Supabase Schema Fallback]: Inserindo apenas colunas v1 até que schema_p0_dre_v2.sql seja executado.');
        const legacyPayload = {
          name,
          category,
          price: price ?? 0,
          description: description || '',
          image: fullPecaPayload.image,
          status: initialStatus,
          passport_id: generatedPassportId,
          expert_name: fullPecaPayload.expert_name,
          expert_date: fullPecaPayload.expert_date
        };

        const legacyResult = await supabase
          .from('pecas')
          .insert([legacyPayload])
          .select()
          .single();

        data = legacyResult.data ? { ...fullPecaPayload, ...legacyResult.data } : null;
        error = legacyResult.error;
      }

      if (error) {
        console.warn('[Supabase POST /pecas Fallback]:', error.message);
      } else if (data) {
        createdPiece = data;
      }
    }

    if (!createdPiece) {
      createdPiece = {
        id: localPecas.length + 100,
        ...fullPecaPayload,
        created_at: new Date().toISOString()
      };
    }

    localPecas.unshift(createdPiece);

    // RF19: Registra evento `peca_cadastrada`
    await logEvent({
      eventName: 'peca_cadastrada',
      pecaId: createdPiece.id,
      passportId: createdPiece.passport_id,
      userId: ownerId || null,
      origin: 'direto',
      isOwner: true,
      metadata: { category: createdPiece.category, status: createdPiece.status }
    });

    // RF05 / RF16: Registra notificação do registro da peça para o proprietário
    if (ownerId) {
      await dispatchNotification({
        userId: ownerId,
        tipo: 'primeiro_investimento',
        titulo: `Peça registrada: ${createdPiece.name}`,
        mensagem: `Sua peça "${createdPiece.name}" recebeu o protocolo ${createdPiece.passport_id} e está em análise da curadoria. Ative "Laudo concluído" em Notificações para ser avisado assim que o perito assinar o laudo.`,
        pecaId: createdPiece.id,
        passportId: createdPiece.passport_id,
        acaoUrl: `/passaporte/${createdPiece.share_token || createdPiece.passport_id}?origem=alerta`,
        respectPreferences: false
      });
    }

    // Dispara alerta automático para usuários que têm peças da mesma categoria na Lista de Desejos
    await notifyCompatibleWishlistsForNewPeca(createdPiece);

    // Dispara notificação inicial para usuários que acompanham a categoria da peça
    try {
      const trackingUserIds = await getUsersTrackingCategory(createdPiece.category);
      const displayCat = /^watches?$/i.test(String(createdPiece.category || '').trim())
        ? 'Relógios'
        : String(createdPiece.category || '').trim() || 'Peça';

      for (const trackerUserId of trackingUserIds) {
        if (ownerId && String(trackerUserId) === String(ownerId)) continue;
        await dispatchNotification({
          userId: trackerUserId,
          tipo: 'peca_pendente',
          titulo: `Nova peça em análise: ${createdPiece.name}`,
          mensagem: `Um novo produto da categoria ${displayCat} (${createdPiece.name}) foi cadastrado e está aguardando verificação da curadoria.`,
          pecaId: createdPiece.id,
          passportId: createdPiece.passport_id,
          acaoUrl: `/peca/${createdPiece.id}`,
          respectPreferences: false
        });
      }
    } catch (notifErr) {
      console.error('[Category Tracker Notification Error]:', notifErr.message);
    }

    res.status(201).json(formatPecaPassport(createdPiece, getFrontendBaseUrl()));
  } catch (err) {
    console.error('Erro inesperado ao criar peça:', err);
    res.status(500).json({ message: 'Erro interno ao salvar peça' });
  }
});

// PATCH /api/pecas/:id/status - Aprovação e verificação por representante da loja
router.patch('/:id/status', requireStoreRole, async (req, res) => {
  const { id } = req.params;
  const requestedStatus = req.body.status || 'APPROVED';

  try {
    const isNumeric = /^\d+$/.test(id);
    let peca = null;

    if (supabase) {
      if (isNumeric) {
        const { data } = await supabase.from('pecas').select('*').eq('id', Number(id)).maybeSingle();
        peca = data;
      } else {
        const { data } = await supabase.from('pecas').select('*').eq('passport_id', id).maybeSingle();
        peca = data;
      }
    }

    if (peca) {
      const localUpdated = localPecas.find(
        (p) => String(p.id) === String(peca.id) || p.passport_id === peca.passport_id
      );
      if (localUpdated) {
        peca = { ...peca, ...localUpdated };
      }
    } else {
      peca = localPecas.find((p) => String(p.id) === String(id) || p.passport_id === id);
    }

    if (!peca) {
      return res.status(404).json({ message: 'Peça não encontrada para verificação' });
    }

    [peca] = await hydratePecasWithCurationEvents([peca]);

    // Idempotência: se já estiver aprovada, retorna sem gerar notificações duplicadas
    if (peca.status === 'APPROVED' && requestedStatus === 'APPROVED') {
      return res.json({
        message: 'A peça já está verificada.',
        peca: formatPecaPassport(peca, getFrontendBaseUrl())
      });
    }

    const expertName = req.body.expertName || 'Curadoria Lastro';
    const expertDate = new Date().toLocaleDateString('pt-BR');
    const updatedHistory = [
      ...(Array.isArray(peca.history) ? peca.history : []),
      {
        date: String(new Date().getFullYear()),
        title: 'Aprovação de Curadoria e Emissão de Passaporte',
        details: 'Dossiê técnico e originalidade verificados pela equipe credenciada da Lastro.',
        verifiedBy: expertName
      }
    ];

    const updatePayload = {
      status: requestedStatus,
      expert_name: expertName,
      expert_date: expertDate,
      history: updatedHistory,
      updated_at: new Date().toISOString()
    };

    const updateCandidates = [
      updatePayload,
      {
        status: requestedStatus,
        expert_name: expertName,
        expert_date: expertDate,
        history: updatedHistory
      },
      {
        status: requestedStatus,
        expert_name: expertName,
        expert_date: expertDate
      }
    ];

    let updatedPeca = null;

    if (supabase) {
      for (const candidatePayload of updateCandidates) {
        try {
          const { data, error } = await supabase
            .from('pecas')
            .update(candidatePayload)
            .eq('id', peca.id)
            .select()
            .maybeSingle();

          if (!error && data) {
            updatedPeca = data;
            break;
          }
          if (error) {
            console.warn('[Supabase Update peca status Warning]:', error.message);
          }
        } catch (dbErr) {
          console.warn('[Supabase Update peca status Warning]:', dbErr.message);
        }
      }
    }

    if (!updatedPeca) {
      updatedPeca = {
        ...peca,
        ...updatePayload
      };
    }

    const localIdx = localPecas.findIndex((p) => String(p.id) === String(peca.id));
    if (localIdx !== -1) {
      localPecas[localIdx] = updatedPeca;
    } else {
      localPecas.unshift(updatedPeca);
    }

    await logEvent({
      eventName: 'curadoria_decidida',
      pecaId: updatedPeca.id,
      passportId: updatedPeca.passport_id,
      userId: req.user?.id || null,
      origin: 'direto',
      isOwner: false,
      metadata: { status: requestedStatus, expert: expertName, expertDate }
    });

    if (requestedStatus === 'APPROVED') {
      try {
        const trackingUserIds = await getUsersTrackingCategory(updatedPeca.category);
        const displayCat = /^watches?$/i.test(String(updatedPeca.category || '').trim())
          ? 'Relógios'
          : String(updatedPeca.category || '').trim() || 'Peça';

        for (const trackerUserId of trackingUserIds) {
          await dispatchNotification({
            userId: trackerUserId,
            tipo: 'peca_aprovada',
            titulo: `Peça verificada: ${updatedPeca.name}`,
            mensagem: `O produto "${updatedPeca.name}" da categoria ${displayCat} foi verificado pela Curadoria Lastro e já está disponível para consulta.`,
            pecaId: updatedPeca.id,
            passportId: updatedPeca.passport_id,
            acaoUrl: `/peca/${updatedPeca.id}`,
            respectPreferences: false
          });
        }
      } catch (notifErr) {
        console.error('[Approval Notification Error]:', notifErr.message);
      }
    }

    res.json({
      message: 'Status da peça atualizado com sucesso!',
      peca: formatPecaPassport(updatedPeca, getFrontendBaseUrl())
    });
  } catch (err) {
    console.error('Erro ao atualizar status da peça:', err);
    res.status(500).json({ message: 'Erro interno ao atualizar status da peça' });
  }
});

// POST /api/pecas/:id/aprovar - Alias direto para aprovação de peça
router.post('/:id/aprovar', requireStoreRole, async (req, res) => {
  req.body.status = 'APPROVED';
  const patchHandler = router.stack.find(
    (layer) => layer.route && layer.route.path === '/:id/status' && layer.route.methods.patch
  );
  if (patchHandler) {
    return patchHandler.handle(req, res);
  }
  res.status(500).json({ message: 'Handler não disponível' });
});

module.exports = router;
