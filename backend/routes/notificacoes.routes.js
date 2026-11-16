const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const { preferenciasNotificacaoSchema } = require('../schemas/habito.schema');
const { logEvent } = require('../utils/eventLogger');

// In-memory fallback cache for notifications
const localNotifications = [];

/**
 * Creates and persists a notification with duplicate prevention
 */
const createNotification = async ({
  userId,
  tipo,
  titulo,
  mensagem,
  pecaId = null,
  passportId = null,
  acaoUrl = null
}) => {
  if (!userId || !tipo || !titulo || !mensagem) {
    throw new Error('userId, tipo, titulo e mensagem são obrigatórios');
  }

  const strUserId = String(userId);
  const numPecaId = pecaId ? Number(pecaId) : null;

  // 1. Duplicate check in local cache
  const existingLocal = localNotifications.find(
    (n) =>
      String(n.user_id) === strUserId &&
      n.tipo === tipo &&
      (numPecaId ? Number(n.peca_id) === numPecaId : true)
  );

  if (existingLocal) {
    return existingLocal;
  }

  const newNotification = {
    id: crypto.randomUUID(),
    user_id: strUserId,
    tipo,
    titulo,
    mensagem,
    peca_id: numPecaId,
    passport_id: passportId || null,
    acao_url: acaoUrl || (numPecaId ? `/peca/${numPecaId}` : null),
    lida: false,
    criado_em: new Date().toISOString()
  };

  // 2. Try persisting to Supabase
  if (supabase) {
    try {
      // Check duplicate in Supabase
      if (numPecaId) {
        const { data: dupCheck } = await supabase
          .from('notificacoes')
          .select('id')
          .eq('user_id', strUserId)
          .eq('tipo', tipo)
          .eq('peca_id', numPecaId)
          .maybeSingle();

        if (dupCheck) {
          return dupCheck;
        }
      }

      const { data, error } = await supabase
        .from('notificacoes')
        .insert([newNotification])
        .select()
        .single();

      if (!error && data) {
        localNotifications.unshift(data);
        return data;
      }
      if (error) {
        console.warn('[Supabase Notification Insert Fallback]:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase Notification Insert Warning]:', err.message);
    }
  }

  // 3. Fallback to local store
  localNotifications.unshift(newNotification);
  return newNotification;
};

// GET /api/notificacoes/preferencias - Obter preferências do usuário
router.get('/preferencias', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId é obrigatório' });
  }

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('preferencias_notificacao')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return res.json({
          userId: data.user_id,
          alertasAtivos: data.alertas_ativos,
          lembretesAtivos: data.lembretes_ativos,
          notificarPecasCompativeis: data.notificar_pecas_compativeis,
          notificarLaudoConcluido: data.notificar_laudo_concluido,
          frequenciaLembrete: data.frequencia_lembrete,
          canalEmail: data.canal_email,
          canalPush: data.canal_push
        });
      }
    }

    res.json({
      userId,
      alertasAtivos: true,
      lembretesAtivos: false,
      notificarPecasCompativeis: true,
      notificarLaudoConcluido: true,
      frequenciaLembrete: 'semestral',
      canalEmail: false,
      canalPush: true
    });
  } catch (err) {
    console.error('Erro ao obter preferências:', err);
    res.status(500).json({ message: 'Erro interno ao obter preferências de notificação' });
  }
});

// PUT /api/notificacoes/preferencias - Atualizar preferências (RF14)
router.put('/preferencias', validate(preferenciasNotificacaoSchema), async (req, res) => {
  const { userId, alertasAtivos, lembretesAtivos, notificarPecasCompativeis,
    notificarLaudoConcluido, frequenciaLembrete, canalEmail, canalPush } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'userId é obrigatório' });
  }

  try {
    if (supabase) {
      await supabase
        .from('preferencias_notificacao')
        .upsert([{
          user_id: userId,
          alertas_ativos: alertasAtivos,
          lembretes_ativos: lembretesAtivos,
          notificar_pecas_compativeis: notificarPecasCompativeis,
          notificar_laudo_concluido: notificarLaudoConcluido,
          frequencia_lembrete: frequenciaLembrete,
          canal_email: canalEmail,
          canal_push: canalPush,
          atualizado_em: new Date().toISOString()
        }], { onConflict: 'user_id' });
    }

    await logEvent({
      eventName: lembretesAtivos === false ? 'alerta_desativado' : 'alerta_configurado',
      userId,
      origin: 'direto',
      isOwner: true,
      metadata: { acao: 'atualizar_preferencias', alertasAtivos }
    });

    res.json({
      userId,
      alertasAtivos,
      lembretesAtivos,
      notificarPecasCompativeis,
      notificarLaudoConcluido,
      frequenciaLembrete,
      canalEmail,
      canalPush
    });
  } catch (err) {
    console.error('Erro ao atualizar preferências:', err);
    res.status(500).json({ message: 'Erro interno ao atualizar preferências de notificação' });
  }
});

// GET /api/notificacoes - Listar notificações do usuário
router.get('/', async (req, res) => {
  const { userId, lida, limit = 50 } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId é obrigatório' });
  }

  const strUserId = String(userId);

  try {
    let result = [];

    // 1. Tenta buscar no Supabase
    if (supabase) {
      try {
        let query = supabase
          .from('notificacoes')
          .select('*')
          .eq('user_id', strUserId)
          .order('criado_em', { ascending: false })
          .limit(Math.min(Number(limit) || 50, 200));

        if (lida !== undefined) {
          query = query.eq('lida', lida === 'true');
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          result = data;
        }
      } catch (dbErr) {
        console.warn('[Supabase GET notificacoes Warning]:', dbErr.message);
      }
    }

    // 2. Mescla com notificações em cache local
    const fromLocal = localNotifications.filter(
      (n) => String(n.user_id) === strUserId && (lida === undefined || n.lida === (lida === 'true'))
    );

    const map = new Map();
    for (const item of result) {
      map.set(item.id, item);
    }
    for (const item of fromLocal) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    );

    res.json(combined);
  } catch (err) {
    console.error('Erro ao listar notificações:', err);
    res.status(500).json({ message: 'Erro interno ao listar notificações' });
  }
});

// PATCH /api/notificacoes/:id/ler - Marcar notificação como lida
router.patch('/:id/ler', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  try {
    let updated = null;

    if (supabase) {
      try {
        let query = supabase
          .from('notificacoes')
          .update({ lida: true })
          .eq('id', id);

        if (userId) {
          query = query.eq('user_id', String(userId));
        }

        const { data } = await query.select().maybeSingle();
        if (data) updated = data;
      } catch (e) {
        console.warn('[Supabase Notification Read Update]:', e.message);
      }
    }

    const localItem = localNotifications.find((n) => String(n.id) === String(id));
    if (localItem) {
      localItem.lida = true;
      if (!updated) updated = localItem;
    }

    if (!updated) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    res.json({ message: 'Notificação marcada como lida', notificacao: updated });
  } catch (err) {
    console.error('Erro ao marcar notificação como lida:', err);
    res.status(500).json({ message: 'Erro interno ao marcar notificação como lida' });
  }
});

// POST /api/notificacoes - Criar notificação
router.post('/', async (req, res) => {
  const { userId, tipo, titulo, mensagem, pecaId, passportId, acaoUrl } = req.body;

  try {
    const data = await createNotification({
      userId,
      tipo,
      titulo,
      mensagem,
      pecaId,
      passportId,
      acaoUrl
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao criar notificação:', err);
    res.status(400).json({ message: err.message || 'Erro interno ao criar notificação' });
  }
});

module.exports = {
  router,
  createNotification
};
