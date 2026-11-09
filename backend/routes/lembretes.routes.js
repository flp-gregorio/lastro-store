const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const {
  configurarLembreteSchema,
  atualizarLembreteSchema
} = require('../schemas/habito.schema');
const { logEvent } = require('../utils/eventLogger');

// GET /api/lembretes - Listar lembretes do usuário/peça
router.get('/', async (req, res) => {
  const { ownerId, pecaId, ativo } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    let query = supabase
      .from('lembretes_conservacao')
      .select('*')
      .order('created_at', { ascending: false });

    if (ownerId) query = query.eq('owner_id', ownerId);
    if (pecaId) query = query.eq('peca_id', Number(pecaId));
    if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase GET /lembretes Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao listar lembretes' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro inesperado ao listar lembretes:', err);
    res.status(500).json({ message: 'Erro interno ao listar lembretes' });
  }
});

// POST /api/lembretes - Configurar lembrete de conservação (RF09)
router.post('/', validate(configurarLembreteSchema), async (req, res) => {
  const { pecaId, tipo, frequencia, proximaNotificacao, ativo, ownerId } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!ownerId) {
      return res.status(400).json({ message: 'ownerId é obrigatório' });
    }

    const { data, error } = await supabase
      .from('lembretes_conservacao')
      .insert([{
        peca_id: pecaId,
        owner_id: ownerId,
        tipo,
        frequencia,
        proxima_notificacao: proximaNotificacao || null,
        ativo
      }])
      .select()
      .single();

    if (error) {
      console.error('[Supabase POST /lembretes Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao configurar lembrete', error: error.message });
    }

    // RF19: Registra evento `alerta_configurado`
    await logEvent({
      eventName: 'alerta_configurado',
      pecaId,
      userId: ownerId,
      origin: 'direto',
      isOwner: true,
      metadata: { lembreteId: data.id, tipo, frequencia, proximaNotificacao }
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro inesperado ao configurar lembrete:', err);
    res.status(500).json({ message: 'Erro interno ao configurar lembrete de conservação' });
  }
});

// PUT /api/lembretes/:lembreteId - Atualizar lembrete (RF09)
router.put('/:lembreteId', validate(atualizarLembreteSchema), async (req, res) => {
  const { lembreteId } = req.params;
  const { frequencia, proximaNotificacao, ativo, ownerId } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const { data: existente, error: findError } = await supabase
      .from('lembretes_conservacao')
      .select('id, owner_id, peca_id')
      .eq('id', lembreteId)
      .maybeSingle();

    if (findError || !existente) {
      return res.status(404).json({ message: 'Lembrete não encontrado' });
    }

    if (String(existente.owner_id) !== String(ownerId)) {
      return res.status(403).json({ message: 'Não autorizado a alterar este lembrete' });
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (frequencia !== undefined) updateData.frequencia = frequencia;
    if (proximaNotificacao !== undefined) updateData.proxima_notificacao = proximaNotificacao;
    if (ativo !== undefined) updateData.ativo = ativo;

    const { data, error } = await supabase
      .from('lembretes_conservacao')
      .update(updateData)
      .eq('id', lembreteId)
      .select()
      .single();

    if (error) {
      console.error('[Supabase PUT /lembretes Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao atualizar lembrete', error: error.message });
    }

    await logEvent({
      eventName: 'alerta_configurado',
      pecaId: existente.peca_id,
      userId: ownerId,
      origin: 'direto',
      isOwner: true,
      metadata: { lembreteId, acao: 'atualizar', alteracoes: updateData }
    });

    res.json(data);
  } catch (err) {
    console.error('Erro inesperado ao atualizar lembrete:', err);
    res.status(500).json({ message: 'Erro interno ao atualizar lembrete' });
  }
});

// DELETE /api/lembretes/:lembreteId - Desativar lembrete (RF09 e RF14)
router.delete('/:lembreteId', async (req, res) => {
  const { lembreteId } = req.params;
  const { ownerId } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const { data: existente, error: findError } = await supabase
      .from('lembretes_conservacao')
      .select('id, owner_id, peca_id')
      .eq('id', lembreteId)
      .maybeSingle();

    if (findError || !existente) {
      return res.status(404).json({ message: 'Lembrete não encontrado' });
    }

    if (ownerId && String(existente.owner_id) !== String(ownerId)) {
      return res.status(403).json({ message: 'Não autorizado a desativar este lembrete' });
    }

    const { data, error } = await supabase
      .from('lembretes_conservacao')
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq('id', lembreteId)
      .select()
      .single();

    if (error) {
      console.error('[Supabase DELETE /lembretes Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao desativar lembrete', error: error.message });
    }

    await logEvent({
      eventName: 'alerta_desativado',
      pecaId: existente.peca_id,
      userId: ownerId,
      origin: 'direto',
      isOwner: true,
      metadata: { lembreteId, acao: 'desativar' }
    });

    res.json({ message: 'Lembrete desativado com sucesso', lembrete: data });
  } catch (err) {
    console.error('Erro inesperado ao desativar lembrete:', err);
    res.status(500).json({ message: 'Erro interno ao desativar lembrete' });
  }
});

module.exports = router;