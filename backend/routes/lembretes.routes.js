const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const {
  configurarLembreteSchema,
  atualizarLembreteSchema
} = require('../schemas/habito.schema');
const { logEvent } = require('../utils/eventLogger');
const {
  dispatchNotification,
  inMemoryLembretes
} = require('../utils/notificationHelper');

// GET /api/lembretes - Listar lembretes do usuário/peça
router.get('/', async (req, res) => {
  const { ownerId, pecaId, ativo } = req.query;

  try {
    if (supabase) {
      let query = supabase
        .from('lembretes_conservacao')
        .select('*')
        .order('created_at', { ascending: false });

      if (ownerId) query = query.eq('owner_id', ownerId);
      if (pecaId) query = query.eq('peca_id', Number(pecaId));
      if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');

      const { data, error } = await query;

      if (!error && data) {
        return res.json(data);
      }
      if (error) {
        console.warn('[Supabase GET /lembretes Fallback]:', error.message);
      }
    }

    const filtered = inMemoryLembretes.filter((l) => {
      if (ownerId && String(l.owner_id) !== String(ownerId)) return false;
      if (pecaId && Number(l.peca_id) !== Number(pecaId)) return false;
      if (ativo !== undefined && Boolean(l.ativo) !== (ativo === 'true')) return false;
      return true;
    });

    res.json(filtered);
  } catch (err) {
    console.error('Erro inesperado ao listar lembretes:', err);
    res.status(500).json({ message: 'Erro interno ao listar lembretes' });
  }
});

// POST /api/lembretes - Configurar lembrete de conservação (RF09)
router.post('/', validate(configurarLembreteSchema), async (req, res) => {
  const { pecaId, tipo, frequencia, proximaNotificacao, ativo, ownerId } = req.body;

  try {
    let savedRecord = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('lembretes_conservacao')
        .insert([
          {
            peca_id: pecaId,
            owner_id: ownerId,
            tipo,
            frequencia,
            proxima_notificacao: proximaNotificacao || null,
            ativo
          }
        ])
        .select()
        .single();

      if (!error && data) {
        savedRecord = data;
      } else if (error) {
        console.warn('[Supabase POST /lembretes Fallback]:', error.message);
      }
    }

    if (!savedRecord) {
      savedRecord = {
        id: crypto.randomUUID(),
        peca_id: pecaId,
        owner_id: ownerId,
        tipo,
        frequencia,
        proxima_notificacao: proximaNotificacao || null,
        ativo: ativo !== undefined ? ativo : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemoryLembretes.unshift(savedRecord);
    }

    // RF19: Registra evento `alerta_configurado`
    await logEvent({
      eventName: 'alerta_configurado',
      pecaId,
      userId: ownerId,
      origin: 'direto',
      isOwner: true,
      metadata: { lembreteId: savedRecord.id, tipo, frequencia, proximaNotificacao }
    });

    // Critério de Aceite 9 (RF09 + RF14): Dispara notificação apenas se `lembretesAtivos` estiver ligado
    const notifResult = await dispatchNotification({
      userId: ownerId,
      tipo: 'lembrete_conservacao',
      titulo: `Lembrete de ${tipo} agendado (${frequencia})`,
      mensagem: `Lembrete ${frequencia} de ${tipo} configurado para a peça #${pecaId}. Mantenha o Passaporte Digital atualizado após cada manutenção.`,
      pecaId,
      acaoUrl: `/peca/${pecaId}`,
      respectPreferences: true
    });

    res.status(201).json({
      ...savedRecord,
      notificacaoDisparada: notifResult.sent,
      notificacaoMensagem: notifResult.sent
        ? 'Notificação de lembrete enviada.'
        : notifResult.reason
    });
  } catch (err) {
    console.error('Erro inesperado ao configurar lembrete:', err);
    res.status(500).json({ message: 'Erro interno ao configurar lembrete de conservação' });
  }
});

// PUT /api/lembretes/:lembreteId - Atualizar lembrete (RF09)
router.put('/:lembreteId', validate(atualizarLembreteSchema), async (req, res) => {
  const { lembreteId } = req.params;
  const { tipo, frequencia, proximaNotificacao, ativo, ownerId } = req.body;

  try {
    const updateData = { updated_at: new Date().toISOString() };
    if (tipo !== undefined) updateData.tipo = tipo;
    if (frequencia !== undefined) updateData.frequencia = frequencia;
    if (proximaNotificacao !== undefined) updateData.proxima_notificacao = proximaNotificacao;
    if (ativo !== undefined) updateData.ativo = ativo;

    if (supabase) {
      const { data: existente, error: findError } = await supabase
        .from('lembretes_conservacao')
        .select('id, owner_id, peca_id')
        .eq('id', lembreteId)
        .maybeSingle();

      if (!findError && existente) {
        if (ownerId && String(existente.owner_id) !== String(ownerId)) {
          return res.status(403).json({ message: 'Não autorizado a alterar este lembrete' });
        }

        const { data, error } = await supabase
          .from('lembretes_conservacao')
          .update(updateData)
          .eq('id', lembreteId)
          .select()
          .single();

        if (!error && data) {
          await logEvent({
            eventName: ativo === false ? 'alerta_desativado' : 'alerta_configurado',
            pecaId: existente.peca_id,
            userId: ownerId || existente.owner_id,
            origin: 'direto',
            isOwner: true,
            metadata: { lembreteId, acao: 'atualizar', alteracoes: updateData }
          });
          return res.json(data);
        }
      }
    }

    // Fallback em memória
    const memItem = inMemoryLembretes.find((l) => String(l.id) === String(lembreteId));
    if (!memItem) {
      return res.status(404).json({ message: 'Lembrete não encontrado' });
    }
    Object.assign(memItem, updateData);

    await logEvent({
      eventName: ativo === false ? 'alerta_desativado' : 'alerta_configurado',
      pecaId: memItem.peca_id,
      userId: ownerId || memItem.owner_id,
      origin: 'direto',
      isOwner: true,
      metadata: { lembreteId, acao: 'atualizar', alteracoes: updateData }
    });

    res.json(memItem);
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
    if (supabase) {
      const { data: existente, error: findError } = await supabase
        .from('lembretes_conservacao')
        .select('id, owner_id, peca_id')
        .eq('id', lembreteId)
        .maybeSingle();

      if (!findError && existente) {
        if (ownerId && String(existente.owner_id) !== String(ownerId)) {
          return res.status(403).json({ message: 'Não autorizado a desativar este lembrete' });
        }

        const { data, error } = await supabase
          .from('lembretes_conservacao')
          .update({ ativo: false, updated_at: new Date().toISOString() })
          .eq('id', lembreteId)
          .select()
          .single();

        if (!error && data) {
          await logEvent({
            eventName: 'alerta_desativado',
            pecaId: existente.peca_id,
            userId: ownerId || existente.owner_id,
            origin: 'direto',
            isOwner: true,
            metadata: { lembreteId, acao: 'desativar' }
          });

          return res.json({ message: 'Lembrete desativado com sucesso', lembrete: data });
        }
      }
    }

    // Fallback em memória
    const memItem = inMemoryLembretes.find((l) => String(l.id) === String(lembreteId));
    if (!memItem) {
      return res.status(404).json({ message: 'Lembrete não encontrado' });
    }
    memItem.ativo = false;
    memItem.updated_at = new Date().toISOString();

    await logEvent({
      eventName: 'alerta_desativado',
      pecaId: memItem.peca_id,
      userId: ownerId || memItem.owner_id,
      origin: 'direto',
      isOwner: true,
      metadata: { lembreteId, acao: 'desativar' }
    });

    res.json({ message: 'Lembrete desativado com sucesso', lembrete: memItem });
  } catch (err) {
    console.error('Erro inesperado ao desativar lembrete:', err);
    res.status(500).json({ message: 'Erro interno ao desativar lembrete' });
  }
});

module.exports = router;
