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
const {
  isMockActive,
  getMockItems,
  findMockItemByIdOrPassport,
  addMockItem
} = require('../mocks/data');

const getFrontendBaseUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

// GET /api/pecas - Listar todas as peças
router.get('/', async (req, res) => {
  try {
    const mockMode = isMockActive(supabase);
    if (!supabase && !mockMode) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const baseUrl = getFrontendBaseUrl();

    if (mockMode) {
      const mockItems = getMockItems();
      return res.json(mockItems.map((item) => formatPecaPassport(item, baseUrl)));
    }

    const { data, error } = await supabase
      .from('pecas')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('[Supabase GET /pecas Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao consultar peças', error: error.message });
    }

    res.json(data.map((item) => formatPecaPassport(item, baseUrl)));
  } catch (err) {
    console.error('Erro inesperado ao listar peças:', err);
    res.status(500).json({ message: 'Erro interno ao consultar peças' });
  }
});

// GET /api/pecas/:id - Buscar peça específica (por id, passport_id ou share_token)
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const mockMode = isMockActive(supabase);
    if (!supabase && !mockMode) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (mockMode) {
      const item = findMockItemByIdOrPassport(id);
      if (!item) {
        return res.status(404).json({ message: 'Peça não encontrada' });
      }
      return res.json(formatPecaPassport(item, getFrontendBaseUrl()));
    }

    const isNumeric = /^\d+$/.test(id);
    let data = null;
    let error = null;

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

    if (error) {
      console.error('[Supabase GET /pecas/:id Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao buscar peça', error: error.message });
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

// POST /api/pecas - Cadastrar nova peça com validação Zod e campos P0 do Passaporte
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

  const mockMode = isMockActive(supabase);
  if (!supabase && !mockMode) {
    return res.status(500).json({ message: 'Supabase não está configurado no .env' });
  }

  // RNF11: Identificadores não enumeráveis
  const generatedPassportId = generatePassportId();
  const generatedShareToken = generateShareToken();

  // RF03: Campos sem informação ficam como 'Não informado' sem inferência
  const fullPecaPayload = {
    name,
    category,
    price: price ?? 0,
    description: description || '',
    image: image || 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000&auto=format&fit=crop',
    status: 'em revisão',
    passport_id: generatedPassportId,
    expert_name: nonInferredField(expertName),
    expert_date: nonInferredField(expertDate),
    owner_id: ownerId || null,
    provenance: nonInferredField(provenance),
    conservation_state: nonInferredField(conservationState),
    conservation_score: conservationScore ?? null,
    history: Array.isArray(history) ? history : [],
    share_token: generatedShareToken,
    share_status: 'active',
    is_published: isPublished !== undefined ? isPublished : true
  };

  try {
    let data = null;

    if (mockMode) {
      data = addMockItem(fullPecaPayload);
    } else {
      let { data: inserted, error } = await supabase
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
          status: 'em revisão',
          passport_id: generatedPassportId,
          expert_name: nonInferredField(expertName),
          expert_date: nonInferredField(expertDate)
        };

        const legacyResult = await supabase
          .from('pecas')
          .insert([legacyPayload])
          .select()
          .single();

        inserted = legacyResult.data ? { ...fullPecaPayload, ...legacyResult.data } : null;
        error = legacyResult.error;
      }

      if (error) {
        console.error('[Supabase POST /pecas Error]:', error.message);
        return res.status(400).json({ message: 'Erro ao cadastrar peça no banco', error: error.message });
      }
      data = inserted;
    }

    // RF19: Registra evento `peca_cadastrada`
    await logEvent({
      eventName: 'peca_cadastrada',
      pecaId: data.id,
      passportId: data.passport_id,
      userId: ownerId || null,
      origin: 'direto',
      isOwner: true,
      metadata: { category: data.category }
    });

    res.status(201).json(formatPecaPassport(data, getFrontendBaseUrl()));
  } catch (err) {
    console.error('Erro inesperado ao criar peça:', err);
    res.status(500).json({ message: 'Erro interno ao salvar peça' });
  }
});

module.exports = router;
