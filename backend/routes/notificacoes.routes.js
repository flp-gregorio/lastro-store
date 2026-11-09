const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const { preferenciasNotificacaoSchema } = require('../schemas/habito.schema');
const { logEvent } = require('../utils/eventLogger');

// GET /api/notificacoes/preferencias - Obter preferências do usuário
router.get('/preferencias', async (req, res) => {
  const { userId } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const { data, error } = await supabase
      .from('preferencias_notificacao')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Supabase GET /notificacoes/preferencias Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao obter preferências' });
    }

    if (!data) {
      return res.json({
        userId,
        alertasAtivos: false,
        lembretesAtivos: false,
        notificarPecasCompativeis: false,
        notificarLaudoConcluido: false,
        frequenciaLembrete: 'semestral',
        canalEmail: false,
        canalPush: true
      });
    }

    res.json({
      userId: data.user_id,
      alertasAtivos: data.alertas_ativos,
      lembretesAtivos: data.lembretes_ativos,
      notificarPecasCompativeis: data.notificar_pecas_compativeis,
      notificarLaudoConcluido: data.notificar_laudo_concluido,
      frequenciaLembrete: data.frequencia_lembrete,
      canalEmail: data.canal_email,
      canalPush: data.canal_push
    });
  } catch (err) {
    console.error('Erro inesperado ao obter preferências:', err);
    res.status(500).json({ message: 'Erro interno ao obter preferências de notificação' });
  }
});

// PUT /api/notificacoes/preferencias - Atualizar preferências (RF14)
router.put('/preferencias', validate(preferenciasNotificacaoSchema), async (req, res) => {
  const { userId, alertasAtivos, lembretesAtivos, notificarPecasCompativeis,
    notificarLaudoConcluido, frequenciaLembrete, canalEmail, canalPush } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const { data, error } = await supabase
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
      }], { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[Supabase PUT /notificacoes/preferencias Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao atualizar preferências', error: error.message });
    }

    await logEvent({
      eventName: lembretesAtivos === false ? 'alerta_desativado' : 'alerta_configurado',
      userId,
      origin: 'direto',
      isOwner: true,
      metadata: {
        acao: 'atualizar_preferencias',
        alertasAtivos,
        lembretesAtivos,
        notificarPecasCompativeis,
        notificarLaudoConcluido
      }
    });

    res.json({
      userId: data.user_id,
      alertasAtivos: data.alertas_ativos,
      lembretesAtivos: data.lembretes_ativos,
      notificarPecasCompativeis: data.notificar_pecas_compativeis,
      notificarLaudoConcluido: data.notificar_laudo_concluido,
      frequenciaLembrete: data.frequencia_lembrete,
      canalEmail: data.canal_email,
      canalPush: data.canal_push
    });
  } catch (err) {
    console.error('Erro inesperado ao atualizar preferências:', err);
    res.status(500).json({ message: 'Erro interno ao atualizar preferências de notificação' });
  }
});

// GET /api/notificacoes - Listar notificações do usuário
router.get('/', async (req, res) => {
  const { userId, lida, limit = 50 } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    let query = supabase
      .from('notificacoes')
      .select('*')
      .eq('user_id', userId)
      .order('criado_em', { ascending: false })
      .limit(Math.min(Number(limit) || 50, 200));

    if (lida !== undefined) {
      query = query.eq('lida', lida === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase GET /notificacoes Error]:', error.message);
      return res.status(500).json({ message: 'Erro ao listar notificações' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Erro inesperado ao listar notificações:', err);
    res.status(500).json({ message: 'Erro interno ao listar notificações' });
  }
});

// PATCH /api/notificacoes/:id/ler - Marcar notificação como lida
router.patch('/:id/ler', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const { data, error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    res.json({ message: 'Notificação marcada como lida', notificacao: data });
  } catch (err) {
    console.error('Erro inesperado ao marcar notificação como lida:', err);
    res.status(500).json({ message: 'Erro interno ao marcar notificação como lida' });
  }
});

// POST /api/notificacoes - Criar notificação (uso interno/RF10, RF16, RF29)
router.post('/', async (req, res) => {
  const { userId, tipo, titulo, mensagem, pecaId, passportId, acaoUrl } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!userId || !tipo || !titulo || !mensagem) {
      return res.status(400).json({ message: 'userId, tipo, título e mensagem são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('notificacoes')
      .insert([{
        user_id: userId,
        tipo,
        titulo,
        mensagem,
        peca_id: pecaId || null,
        passport_id: passportId || null,
        acao_url: acaoUrl || null
      }])
      .select()
      .single();

    if (error) {
      console.error('[Supabase POST /notificacoes Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao criar notificação', error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro inesperado ao criar notificação:', err);
    res.status(500).json({ message: 'Erro interno ao criar notificação' });
  }
});

module.exports = router;