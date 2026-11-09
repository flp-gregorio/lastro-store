const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const {
  avaliarContraparteSchema,
  listarAvaliacoesSchema
} = require('../schemas/habito.schema');
const { logEvent } = require('../utils/eventLogger');

// ============================================================================
// RF07 · Avaliar contraparte
// Avaliação após interação elegível, vinculada à contraparte e à interação.
// Critérios, moderação e prevenção de abuso a especificar.
// ============================================================================

// GET /api/avaliacoes - Listar avaliações (com filtros opcionais)
router.get('/', validate(listarAvaliacoesSchema, 'query'), async (req, res) => {
  const { avaliadoId, pecaId, limit, offset } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    let query = supabase
      .from('avaliacoes_contraparte')
      .select('*')
      .eq('visibilidade', 'publica')
      .eq('moderado', false)
      .order('criado_em', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (avaliadoId) query = query.eq('avaliado_id', avaliadoId);
    if (pecaId) query = query.eq('peca_id', Number(pecaId));

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase GET /avaliacoes Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao listar avaliações' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro inesperado ao listar avaliações:', err);
    res.status(500).json({ message: 'Erro interno ao listar avaliações' });
  }
});

// POST /api/avaliacoes - Criar avaliação de contraparte (RF07)
router.post('/', validate(avaliarContraparteSchema), async (req, res) => {
  const {
    avaliadorId, avaliadoId, pecaId, passportId, nota, comentario,
    interacaoTipo, interacaoId, visibilidade
  } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!avaliadorId || !avaliadoId) {
      return res.status(400).json({ message: 'avaliadorId e avaliadoId são obrigatórios' });
    }

    // Prevenção de abuso: não permite auto-avaliação
    if (String(avaliadorId) === String(avaliadoId)) {
      return res.status(400).json({ message: 'Não é possível auto-avaliar' });
    }

    const { data, error } = await supabase
      .from('avaliacoes_contraparte')
      .insert([{
        avaliador_id: avaliadorId,
        avaliado_id: avaliadoId,
        peca_id: pecaId || null,
        passport_id: passportId || null,
        nota,
        comentario: comentario || '',
        interacao_tipo: interacaoTipo,
        interacao_id: interacaoId || null,
        visibilidade: visibilidade || 'publica',
        moderado: false
      }])
      .select()
      .single();

    if (error) {
      console.error('[Supabase POST /avaliacoes Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao criar avaliação', error: error.message });
    }

    // RF19: Registra evento de avaliação
    await logEvent({
      eventName: 'curadoria_decidida',
      pecaId,
      passportId,
      userId: avaliadorId,
      origin: 'direto',
      isOwner: true,
      metadata: {
        acao: 'avaliacao_contraparte',
        avaliadoId,
        nota,
        interacaoTipo
      }
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro inesperado ao criar avaliação:', err);
    res.status(500).json({ message: 'Erro interno ao criar avaliação de contraparte' });
  }
});

// GET /api/avaliacoes/estatisticas/:avaliadoId - Estatísticas de avaliações de um usuário
router.get('/estatisticas/:avaliadoId', async (req, res) => {
  const { avaliadoId } = req.params;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const { data, error } = await supabase
      .from('avaliacoes_contraparte')
      .select('nota')
      .eq('avaliado_id', avaliadoId)
      .eq('visibilidade', 'publica')
      .eq('moderado', false);

    if (error) {
      console.error('[Supabase GET /avaliacoes/estatisticas Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao obter estatísticas de avaliações' });
    }

    const avaliacoes = data || [];
    const total = avaliacoes.length;
    const media = total > 0
      ? (avaliacoes.reduce((sum, a) => sum + a.nota, 0) / total).toFixed(2)
      : '0.00';

    res.json({
      avaliadoId,
      totalAvaliacoes: total,
      mediaAvaliacoes: media
    });
  } catch (err) {
    console.error('Erro inesperado ao obter estatísticas:', err);
    res.status(500).json({ message: 'Erro interno ao obter estatísticas de avaliações' });
  }
});

module.exports = router;