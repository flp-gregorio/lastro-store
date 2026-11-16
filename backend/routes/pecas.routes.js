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
const { getUsersTrackingCategory } = require('./categorias-rastreadas.routes');
const { createNotification } = require('./notificacoes.routes');
const { requireStoreRole } = require('../middlewares/auth');

const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// In-memory fallback cache for pieces
const localPecas = [];

// GET /api/pecas - Listar todas as peças
router.get('/', async (req, res) => {
  try {
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
      }
    }

    // Mescla com peças em cache local para garantir disponibilidade e refletir atualizações recentes
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

    const all = Array.from(map.values()).sort((a, b) => Number(b.id) - Number(a.id));
    const baseUrl = getFrontendBaseUrl();
    res.json(all.map((item) => formatPecaPassport(item, baseUrl)));
  } catch (err) {
    console.error('Erro inesperado ao listar peças:', err);
    res.status(500).json({ message: 'Erro interno ao consultar peças' });
  }
});

// GET /api/pecas/:id - Buscar peça específica
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const isNumeric = /^\d+$/.test(id);
    let data = null;

    if (supabase) {
      if (isNumeric) {
        const result = await supabase
          .from('pecas')
          .select('*')
          .eq('id', Number(id))
          .maybeSingle();
        data = result.data;
      } else {
        const byPassport = await supabase
          .from('pecas')
          .select('*')
          .eq('passport_id', id)
          .maybeSingle();
        data = byPassport.data;

        if (!data) {
          const byToken = await supabase
            .from('pecas')
            .select('*')
            .eq('share_token', id)
            .maybeSingle();
          data = byToken.data;
        }
      }
    }

    // Mescla com atualizações locais caso existam
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

    if (!data) {
      return res.status(404).json({ message: 'Peça não encontrada' });
    }

    res.json(formatPecaPassport(data, getFrontendBaseUrl()));
  } catch (err) {
    console.error('Erro inesperado ao buscar peça:', err);
    res.status(500).json({ message: 'Erro interno ao buscar peça' });
  }
});

// POST /api/pecas - Cadastrar nova peça (Stage 3) e notificar usuários rastreadores (Stage 4)
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

  const fullPecaPayload = {
    name,
    category,
    price: price ?? 0,
    description: description || '',
    image: image || 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000&auto=format&fit=crop',
    status: 'UNDER_VALIDATION',
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
        console.warn('[Supabase Schema Fallback]: Tentando inserção com colunas básicas');
        const legacyPayload = {
          name,
          category,
          price: price ?? 0,
          description: description || '',
          image: fullPecaPayload.image,
          status: 'UNDER_VALIDATION',
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
      }

      if (data) {
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

    // =========================================================================
    // STAGE 4: Envio da Notificação Inicial para usuários que rastreiam a categoria (Person B)
    // =========================================================================
    try {
      const trackingUserIds = await getUsersTrackingCategory(createdPiece.category);

      const displayCat = /^watches$/i.test(String(createdPiece.category || '').trim())
        ? 'Relógios'
        : createdPiece.category;

      for (const trackerUserId of trackingUserIds) {
        // Envia notificação comunicando que nova peça da categoria foi cadastrada e aguarda verificação
        await createNotification({
          userId: trackerUserId,
          tipo: 'peca_pendente',
          titulo: `Nova peça em análise: ${createdPiece.name}`,
          mensagem: `Um novo produto da categoria ${displayCat} (${createdPiece.name}) foi cadastrado e está aguardando verificação da curadoria.`,
          pecaId: createdPiece.id,
          passportId: createdPiece.passport_id,
          acaoUrl: `/peca/${createdPiece.id}`
        });
      }
    } catch (notifErr) {
      console.error('[Stage 4 Notification Error]:', notifErr.message);
    }

    res.status(201).json(formatPecaPassport(createdPiece, getFrontendBaseUrl()));
  } catch (err) {
    console.error('Erro inesperado ao criar peça:', err);
    res.status(500).json({ message: 'Erro interno ao salvar peça' });
  }
});

// PATCH /api/pecas/:id/status - Aprovação e verificação por representante da loja (Person C - Stage 5)
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

    if (!peca) {
      peca = localPecas.find((p) => String(p.id) === String(id) || p.passport_id === id);
    }

    if (!peca) {
      return res.status(404).json({ message: 'Peça não encontrada para verificação' });
    }

    // Idempotência: Se já estiver aprovada, retorna sem gerar notificações duplicadas
    if (peca.status === 'APPROVED' && requestedStatus === 'APPROVED') {
      return res.json({
        message: 'A peça já está aprovada.',
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
        details: 'Dossiê técnico e originalidade aprovados pela equipe credenciada da Lastro.',
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

    let updatedPeca = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('pecas')
          .update(updatePayload)
          .eq('id', peca.id)
          .select()
          .maybeSingle();

        if (!error && data) {
          updatedPeca = data;
        }
      } catch (dbErr) {
        console.warn('[Supabase Update peca status Warning]:', dbErr.message);
      }
    }

    if (!updatedPeca) {
      updatedPeca = {
        ...peca,
        ...updatePayload
      };
    }

    // Atualiza cache local
    const localIdx = localPecas.findIndex((p) => String(p.id) === String(peca.id));
    if (localIdx !== -1) {
      localPecas[localIdx] = updatedPeca;
    } else {
      localPecas.unshift(updatedPeca);
    }

    // RF19: Registra evento `curadoria_decidida`
    await logEvent({
      eventName: 'curadoria_decidida',
      pecaId: updatedPeca.id,
      passportId: updatedPeca.passport_id,
      userId: req.user?.id || null,
      origin: 'direto',
      isOwner: false,
      metadata: { status: requestedStatus, expert: expertName }
    });

    // =========================================================================
    // STAGE 6: Envio da Segunda Notificação (Aprovação) para Person B
    // =========================================================================
    if (requestedStatus === 'APPROVED') {
      try {
        const trackingUserIds = await getUsersTrackingCategory(updatedPeca.category);

        const displayCat = /^watches$/i.test(String(updatedPeca.category || '').trim())
          ? 'Relógios'
          : updatedPeca.category;

        for (const trackerUserId of trackingUserIds) {
          await createNotification({
            userId: trackerUserId,
            tipo: 'peca_aprovada',
            titulo: `Peça verificada: ${updatedPeca.name}`,
            mensagem: `O produto "${updatedPeca.name}" da categoria ${displayCat} foi verificado pela Curadoria Lastro e já está disponível para consulta.`,
            pecaId: updatedPeca.id,
            passportId: updatedPeca.passport_id,
            acaoUrl: `/peca/${updatedPeca.id}`
          });
        }
      } catch (notifErr) {
        console.error('[Stage 6 Notification Error]:', notifErr.message);
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
  // Reencaminha internamente para o handler de PATCH
  const patchHandler = router.stack.find((layer) => layer.route && layer.route.path === '/:id/status' && layer.route.methods.patch);
  if (patchHandler) {
    return patchHandler.handle(req, res);
  }
  res.status(500).json({ message: 'Handler não disponível' });
});

module.exports = router;
