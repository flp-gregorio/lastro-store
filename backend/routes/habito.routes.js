const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const {
  registrarRespostaConviteSchema,
  preferenciasAlertaCuradoriaSchema,
  notificarLaudoConcluidoSchema
} = require('../schemas/habito.schema');
const { logEvent } = require('../utils/eventLogger');

// POST /api/habito/convite-primeiro-investimento - Registra resposta ao convite (RF16)
router.post('/convite-primeiro-investimento', validate(registrarRespostaConviteSchema), async (req, res) => {
  const { aceito, acao, passportId, pecaId, userId, anonymousId } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const userOrAnon = userId || anonymousId;
    if (!userOrAnon) {
      return res.status(400).json({ message: 'userId ou anonymousId é obrigatório' });
    }

    const { error: notifError } = await supabase
      .from('notificacoes')
      .insert([{
        user_id: userId || null,
        tipo: aceito ? 'primeiro_investimento' : 'alerta_generico',
        titulo: aceito ? 'Primeiro investimento registrado' : 'Convite dispensado',
        mensagem: aceito
          ? `Você iniciou seu primeiro investimento: ${acao || 'ação não especificada'}.`
          : 'O convite foi dispensado. Você pode salvar peças ou criar listas a qualquer momento.',
        peca_id: pecaId || null,
        passport_id: passportId || null
      }]);

    if (notifError) {
      console.warn('[Supabase POST /habito/convite Warning]:', notifError.message);
    }

    await logEvent({
      eventName: aceito ? 'peca_salva' : 'alerta_desativado',
      pecaId,
      passportId,
      userId,
      anonymousId,
      origin: 'alerta',
      isOwner: Boolean(userId),
      metadata: {
        acao: 'resposta_convite_primeiro_investimento',
        aceito,
        acaoEscolhida: acao
      }
    });

    res.json({
      message: aceito
        ? 'Convite aceito. Obrigado por iniciar seu primeiro investimento.'
        : 'Convite dispensado com sucesso. Sem pressão, sem vergonha.',
      aceito,
      acao: aceito ? acao : null
    });
  } catch (err) {
    console.error('Erro inesperado ao processar convite:', err);
    res.status(500).json({ message: 'Erro interno ao processar convite de primeiro investimento' });
  }
});

// POST /api/habito/alerta-peca-compativel - Dispara alerta de peça compatível (RF10)
router.post('/alerta-peca-compativel', async (req, res) => {
  const { userId, pecaId, passportId, titulo, mensagem, acaoUrl } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const { data: prefs } = await supabase
      .from('preferencias_notificacao')
      .select('notificar_pecas_compativeis')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefs && prefs.notificar_pecas_compativeis === false) {
      return res.json({ message: 'Usuário desativou notificações de peças compatíveis', enviado: false });
    }

    const { data, error } = await supabase
      .from('notificacoes')
      .insert([{
        user_id: userId,
        tipo: 'peca_compatível',
        titulo: titulo || 'Nova peça compatível com sua lista de desejos',
        mensagem: mensagem || 'Uma nova peça da curadoria combina com os itens salvos na sua lista.',
        peca_id: pecaId || null,
        passport_id: passportId || null,
        acao_url: acaoUrl || null
      }])
      .select()
      .single();

    if (error) {
      console.error('[Supabase POST /habito/alerta-peca-compativel Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao criar alerta', error: error.message });
    }

    await logEvent({
      eventName: 'alerta_configurado',
      pecaId,
      passportId,
      userId,
      origin: 'alerta',
      isOwner: true,
      metadata: { acao: 'alerta_peca_compativel', notificacaoId: data.id }
    });

    res.status(201).json({ message: 'Alerta de peça compatível enviado', notificacao: data });
  } catch (err) {
    console.error('Erro inesperado ao enviar alerta de peça compatível:', err);
    res.status(500).json({ message: 'Erro interno ao enviar alerta de peça compatível' });
  }
});

// POST /api/habito/aviso-laudo-concluido - Notifica laudo concluído (RF29)
router.post('/aviso-laudo-concluido', validate(notificarLaudoConcluidoSchema), async (req, res) => {
  const { pecaId, passportId, usuarioId, tipo } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!usuarioId) {
      return res.status(400).json({ message: 'usuarioId é obrigatório' });
    }

    const { data: prefs } = await supabase
      .from('preferencias_notificacao')
      .select('notificar_laudo_concluido')
      .eq('user_id', usuarioId)
      .maybeSingle();

    if (prefs && prefs.notificar_laudo_concluido === false) {
      return res.json({ message: 'Usuário desativou notificações de laudo concluído', enviado: false });
    }

    const { data, error } = await supabase
      .from('notificacoes')
      .insert([{
        user_id: usuarioId,
        tipo: 'laudo_concluido',
        titulo: 'Laudo concluído — Passaporte disponível',
        mensagem: tipo === 'vendedor'
          ? 'O perito concluiu o laudo da sua peça e o passaporte digital está disponível.'
          : 'O perito concluiu o laudo de uma peça que você acompanha. O passaporte está disponível.',
        peca_id: pecaId || null,
        passport_id: passportId || null,
        acao_url: `/passaporte/${passportId}?origem=alerta`
      }])
      .select()
      .single();

    if (error) {
      console.error('[Supabase POST /habito/aviso-laudo-concluido Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao criar aviso de laudo', error: error.message });
    }

    await logEvent({
      eventName: 'laudo_aberto',
      pecaId,
      passportId,
      userId: usuarioId,
      origin: 'direto',
      isOwner: tipo === 'dono',
      metadata: { acao: 'aviso_laudo_concluido', tipoNotificacao: tipo, notificacaoId: data.id }
    });

    res.status(201).json({ message: 'Aviso de laudo concluído enviado', notificacao: data });
  } catch (err) {
    console.error('Erro inesperado ao enviar aviso de laudo:', err);
    res.status(500).json({ message: 'Erro interno ao enviar aviso de laudo concluído' });
  }
});

// GET /api/habito/primeiro-investimento/status - Verifica primeiro investimento
router.get('/primeiro-investimento/status', async (req, res) => {
  const { userId } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const { data: eventos } = await supabase
      .from('eventos')
      .select('event_name')
      .eq('user_id', userId)
      .in('event_name', ['peca_salva', 'lista_criada', 'peca_registrada'])
      .order('created_at', { ascending: true })
      .limit(1);

    const jaInvestiu = eventos && eventos.length > 0;

    res.json({
      userId,
      primeiroInvestimentoFeito: jaInvestiu,
      primeiroEvento: eventos && eventos[0] ? eventos[0].event_name : null
    });
  } catch (err) {
    console.error('Erro inesperado ao verificar primeiro investimento:', err);
    res.status(500).json({ message: 'Erro interno ao verificar status do primeiro investimento' });
  }
});

module.exports = router;