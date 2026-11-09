const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const { transferirPassaporteSchema } = require('../schemas/habito.schema');
const { logEvent } = require('../utils/eventLogger');

// GET /api/transferencias - Listar transferências
router.get('/', async (req, res) => {
  const { pecaId, passportId, deUsuarioId, paraUsuarioId, limit = 50 } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    let query = supabase
      .from('transferencias_passaporte')
      .select('*')
      .order('data_transferencia', { ascending: false })
      .limit(Math.min(Number(limit) || 50, 200));

    if (pecaId) query = query.eq('peca_id', Number(pecaId));
    if (passportId) query = query.eq('passport_id', passportId);
    if (deUsuarioId) query = query.eq('de_usuario_id', deUsuarioId);
    if (paraUsuarioId) query = query.eq('para_usuario_id', paraUsuarioId);

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase GET /transferencias Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao listar transferências' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro inesperado ao listar transferências:', err);
    res.status(500).json({ message: 'Erro interno ao listar transferências' });
  }
});

// POST /api/transferencias - Registrar transferência de passaporte (RF17)
router.post('/', validate(transferirPassaporteSchema), async (req, res) => {
  const {
    pecaId, passportId, paraUsuarioId, tipoTransferencia,
    valorTransacao, observacoes, deUsuarioId
  } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!deUsuarioId || !paraUsuarioId) {
      return res.status(400).json({ message: 'deUsuarioId e paraUsuarioId são obrigatórios' });
    }

    const { data: peca, error: pecaError } = await supabase
      .from('pecas')
      .select('id, passport_id, owner_id')
      .eq('passport_id', passportId)
      .maybeSingle();

    if (pecaError || !peca) {
      return res.status(404).json({ message: 'Passaporte não encontrado' });
    }

    if (String(peca.owner_id) !== String(deUsuarioId)) {
      return res.status(403).json({ message: 'Não autorizado: você não é o proprietário deste passaporte' });
    }

    if (String(deUsuarioId) === String(paraUsuarioId)) {
      return res.status(400).json({ message: 'Não é possível transferir para o mesmo usuário' });
    }

    const { data, error } = await supabase
      .from('transferencias_passaporte')
      .insert([{
        peca_id: pecaId,
        passport_id: passportId,
        de_usuario_id: deUsuarioId,
        para_usuario_id: paraUsuarioId,
        tipo_transferencia: tipoTransferencia,
        valor_transacao: valorTransacao || null,
        historico_preservado: true,
        observacoes: observacoes || ''
      }])
      .select()
      .single();

    if (error) {
      console.error('[Supabase POST /transferencias Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao registrar transferência', error: error.message });
    }

    // Atualiza o proprietário da peça (RF17 - histórico preservado)
    await supabase
      .from('pecas')
      .update({ owner_id: paraUsuarioId, updated_at: new Date().toISOString() })
      .eq('id', peca.id);

    // RF19: Registra evento `titularidade_transferida`
    await logEvent({
      eventName: 'titularidade_transferida',
      pecaId,
      passportId,
      userId: deUsuarioId,
      origin: 'direto',
      isOwner: true,
      metadata: {
        acao: 'transferencia_passaporte',
        tipoTransferencia,
        paraUsuarioId,
        valorTransacao,
        historicoPreservado: true
      }
    });

    res.status(201).json({
      message: 'Transferência de passaporte registrada com sucesso',
      transferencia: data,
      novoProprietario: paraUsuarioId,
      passportId,
      historicoPreservado: true
    });
  } catch (err) {
    console.error('Erro inesperado ao registrar transferência:', err);
    res.status(500).json({ message: 'Erro interno ao registrar transferência de passaporte' });
  }
});

// GET /api/transferencias/historico/:passportId - Histórico de transferências de um passaporte
router.get('/historico/:passportId', async (req, res) => {
  const { passportId } = req.params;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const { data, error } = await supabase
      .from('transferencias_passaporte')
      .select('*')
      .eq('passport_id', passportId)
      .order('data_transferencia', { ascending: false });

    if (error) {
      console.error('[Supabase GET /transferencias/historico Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao obter histórico de transferências' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro inesperado ao obter histórico:', err);
    res.status(500).json({ message: 'Erro interno ao obter histórico de transferências' });
  }
});

module.exports = router;