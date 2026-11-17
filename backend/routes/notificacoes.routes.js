const express = require('express');
const router = express.Router();
const validate = require('../middlewares/validate');
const { preferenciasNotificacaoSchema } = require('../schemas/habito.schema');
const {
  getUserPreferences,
  saveUserPreferences,
  dispatchNotification,
  listUserNotifications,
  markNotificationRead,
  checkAndNotifyExistingCompatiblePecaForUser
} = require('../utils/notificationHelper');

// GET /api/notificacoes/preferencias - Obter preferências do usuário (RF14 / RNF06)
router.get('/preferencias', async (req, res) => {
  const { userId } = req.query;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const prefs = await getUserPreferences(userId);
    res.json(prefs);
  } catch (err) {
    console.error('Erro inesperado ao obter preferências:', err);
    res.status(500).json({ message: 'Erro interno ao obter preferências de notificação' });
  }
});

// PUT /api/notificacoes/preferencias - Atualizar preferências (RF14)
router.put('/preferencias', validate(preferenciasNotificacaoSchema), async (req, res) => {
  try {
    const saved = await saveUserPreferences(req.body);
    if (saved.notificarPecasCompativeis) {
      await checkAndNotifyExistingCompatiblePecaForUser(saved.userId);
    }
    res.json(saved);
  } catch (err) {
    console.error('Erro inesperado ao atualizar preferências:', err);
    res.status(500).json({ message: 'Erro interno ao atualizar preferências de notificação' });
  }
});

// GET /api/notificacoes - Listar notificações do usuário
router.get('/', async (req, res) => {
  const { userId, lida, limit = 50 } = req.query;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const data = await listUserNotifications({ userId, lida, limit });
    res.json(data);
  } catch (err) {
    console.error('Erro inesperado ao listar notificações:', err);
    res.status(500).json({ message: 'Erro interno ao listar notificações' });
  }
});

// PATCH /api/notificacoes/ler-todas - Marcar todas as notificações do usuário como lidas
router.patch('/ler-todas', async (req, res) => {
  const userId = req.query.userId || req.body?.userId;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const updated = await markNotificationRead({ userId, markAll: true });
    res.json({ message: 'Todas as notificações foram marcadas como lidas', count: updated.length });
  } catch (err) {
    console.error('Erro ao marcar todas como lidas:', err);
    res.status(500).json({ message: 'Erro interno ao marcar todas como lidas' });
  }
});

// PATCH /api/notificacoes/:id/ler - Marcar notificação específica como lida
router.patch('/:id/ler', async (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId || req.body?.userId;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const updated = await markNotificationRead({ id, userId, markAll: false });
    if (!updated || updated.length === 0) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    res.json({ message: 'Notificação marcada como lida', notificacao: updated[0] });
  } catch (err) {
    console.error('Erro inesperado ao marcar notificação como lida:', err);
    res.status(500).json({ message: 'Erro interno ao marcar notificação como lida' });
  }
});

// POST /api/notificacoes - Criar/disparar notificação respeitando o Critério de Aceite 9 (RF14)
router.post('/', async (req, res) => {
  const { userId, tipo, titulo, mensagem, pecaId, passportId, acaoUrl, respectPreferences = true } = req.body;

  try {
    if (!userId || !tipo || !titulo || !mensagem) {
      return res.status(400).json({ message: 'userId, tipo, título e mensagem são obrigatórios' });
    }

    const result = await dispatchNotification({
      userId,
      tipo,
      titulo,
      mensagem,
      pecaId,
      passportId,
      acaoUrl,
      respectPreferences
    });

    if (!result.sent) {
      return res.status(200).json({
        enviado: false,
        blockedByPreferences: Boolean(result.blockedByPreferences),
        message: result.reason,
        preferences: result.preferences
      });
    }

    res.status(201).json({
      enviado: true,
      notificacao: result.notificacao
    });
  } catch (err) {
    console.error('Erro inesperado ao criar notificação:', err);
    res.status(500).json({ message: 'Erro interno ao criar notificação' });
  }
});

router.router = router;
router.createNotification = (opts) =>
  dispatchNotification({ ...opts, respectPreferences: false });

module.exports = router;
