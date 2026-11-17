const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const {
  registrarRespostaConviteSchema,
  notificarLaudoConcluidoSchema
} = require('../schemas/habito.schema');
const { logEvent, inMemoryEvents } = require('../utils/eventLogger');
const { dispatchNotification } = require('../utils/notificationHelper');

// POST /api/habito/convite-primeiro-investimento - Registra resposta ao convite (RF16 / Critério de Aceite 7 e 8)
router.post('/convite-primeiro-investimento', validate(registrarRespostaConviteSchema), async (req, res) => {
  const { aceito, acao, passportId, pecaId, userId, anonymousId } = req.body;

  try {
    const userOrAnon = userId || anonymousId;
    if (!userOrAnon) {
      return res.status(400).json({ message: 'userId ou anonymousId é obrigatório' });
    }

    // Se aceitou, cria notificação de confirmação do primeiro investimento (RF16)
    if (aceito) {
      const acaoLabels = {
        salvar_peca: 'Salvar peça na lista de desejos',
        criar_lista: 'Criar lista de desejos',
        registrar_peca_propria: 'Registrar peça própria no acervo'
      };
      await dispatchNotification({
        userId: userOrAnon,
        tipo: 'primeiro_investimento',
        titulo: 'Primeiro investimento registrado na Lastro',
        mensagem: `Ciclo de hábito iniciado: ${acaoLabels[acao] || acao || 'Investimento inicial'}. Agora você pode configurar alertas ou lembretes quando desejar.`,
        pecaId: pecaId || null,
        passportId: passportId || null,
        acaoUrl: passportId ? `/passaporte/${passportId}?origem=alerta` : '/notificacoes',
        respectPreferences: false
      });
    }

    // RF16 / B2: Conta como investimento o primeiro peca_salva, lista_criada ou peca_registrada
    const eventMap = {
      salvar_peca: 'peca_salva',
      criar_lista: 'lista_criada',
      registrar_peca_propria: 'peca_registrada'
    };
    const resolvedEvent = aceito ? eventMap[acao] || 'peca_salva' : 'sessao_iniciada';

    await logEvent({
      eventName: resolvedEvent,
      pecaId,
      passportId,
      userId,
      anonymousId,
      origin: 'direto',
      isOwner: Boolean(userId),
      metadata: {
        acao: 'resposta_convite_primeiro_investimento',
        aceito,
        acaoEscolhida: acao || 'dispensar'
      }
    });

    res.json({
      message: aceito
        ? 'Primeiro investimento registrado com sucesso.'
        : 'Convite dispensado.',
      aceito,
      acao: aceito ? acao : null
    });
  } catch (err) {
    console.error('Erro inesperado ao processar convite:', err);
    res.status(500).json({ message: 'Erro interno ao processar convite de primeiro investimento' });
  }
});

// POST /api/habito/alerta-peca-compativel - Dispara alerta de peça compatível (RF10 / Critério de Aceite 9)
router.post('/alerta-peca-compativel', async (req, res) => {
  const { userId, pecaId, passportId, titulo, mensagem, acaoUrl } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const result = await dispatchNotification({
      userId,
      tipo: 'peca_compatível',
      titulo: titulo || 'Nova peça compatível com sua lista de desejos',
      mensagem:
        mensagem ||
        'Uma nova peça verificada pela curadoria Lastro combina com os itens salvos na sua Lista de Desejos.',
      pecaId: pecaId || null,
      passportId: passportId || null,
      acaoUrl: acaoUrl || (passportId ? `/passaporte/${passportId}?origem=alerta` : '/catalogo'),
      respectPreferences: true
    });

    if (!result.sent) {
      return res.json({
        enviado: false,
        blockedByPreferences: true,
        message: result.reason
      });
    }

    await logEvent({
      eventName: 'alerta_configurado',
      pecaId,
      passportId,
      userId,
      origin: 'alerta',
      isOwner: false,
      metadata: { acao: 'alerta_peca_compativel_enviado', notificacaoId: result.notificacao.id }
    });

    res.status(201).json({
      enviado: true,
      message: 'Alerta de peça compatível enviado com sucesso',
      notificacao: result.notificacao
    });
  } catch (err) {
    console.error('Erro inesperado ao enviar alerta de peça compatível:', err);
    res.status(500).json({ message: 'Erro interno ao enviar alerta de peça compatível' });
  }
});

// POST /api/habito/aviso-laudo-concluido - Notifica laudo concluído (RF29 / Critério de Aceite 9)
router.post('/aviso-laudo-concluido', validate(notificarLaudoConcluidoSchema), async (req, res) => {
  const { pecaId, passportId, usuarioId, tipo } = req.body;

  try {
    const result = await dispatchNotification({
      userId: usuarioId,
      tipo: 'laudo_concluido',
      titulo: 'Laudo pericial concluído — Passaporte emitido',
      mensagem:
        tipo === 'vendedor'
          ? 'O perito credenciado concluiu o laudo da peça em seu estoque e o Passaporte Digital já pode ser compartilhado.'
          : 'O perito credenciado assinou o laudo da sua peça. O Passaporte Digital emitido já está disponível para consulta.',
      pecaId: pecaId || null,
      passportId: passportId || null,
      acaoUrl: passportId ? `/passaporte/${passportId}?origem=alerta` : pecaId ? `/peca/${pecaId}` : '/catalogo',
      respectPreferences: true
    });

    if (!result.sent) {
      return res.json({
        enviado: false,
        blockedByPreferences: true,
        message: result.reason
      });
    }

    await logEvent({
      eventName: 'passaporte_publicado',
      pecaId,
      passportId,
      userId: usuarioId,
      origin: 'alerta',
      isOwner: tipo === 'dono',
      metadata: { acao: 'aviso_laudo_concluido', tipoNotificacao: tipo, notificacaoId: result.notificacao.id }
    });

    res.status(201).json({
      enviado: true,
      message: 'Aviso de laudo concluído enviado com sucesso',
      notificacao: result.notificacao
    });
  } catch (err) {
    console.error('Erro inesperado ao enviar aviso de laudo:', err);
    res.status(500).json({ message: 'Erro interno ao enviar aviso de laudo concluído' });
  }
});

// POST /api/habito/lembrete-conservacao - Dispara notificação de lembrete de conservação (RF09 / Critério de Aceite 9)
router.post('/lembrete-conservacao', async (req, res) => {
  const { userId, pecaId, passportId, frequencia = 'semestral', titulo, mensagem } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const result = await dispatchNotification({
      userId,
      tipo: 'lembrete_conservacao',
      titulo: titulo || `Lembrete ${frequencia} de conservação do acervo`,
      mensagem:
        mensagem ||
        'Chegou o momento de revisar o estado de conservação e atualizar o histórico de manutenção da sua peça no Passaporte Digital.',
      pecaId: pecaId || null,
      passportId: passportId || null,
      acaoUrl: passportId ? `/passaporte/${passportId}?origem=alerta` : '/lembretes',
      respectPreferences: true
    });

    if (!result.sent) {
      return res.json({
        enviado: false,
        blockedByPreferences: true,
        message: result.reason
      });
    }

    res.status(201).json({
      enviado: true,
      message: 'Lembrete de conservação enviado com sucesso',
      notificacao: result.notificacao
    });
  } catch (err) {
    console.error('Erro ao disparar lembrete de conservação:', err);
    res.status(500).json({ message: 'Erro interno ao disparar lembrete de conservação' });
  }
});

// GET /api/habito/primeiro-investimento/status - Verifica primeiro investimento (RF16 / B2)
router.get('/primeiro-investimento/status', async (req, res) => {
  const { userId, anonymousId } = req.query;
  const targetUser = userId || anonymousId;

  try {
    if (!targetUser) {
      return res.status(400).json({ message: 'userId ou anonymousId é obrigatório' });
    }

    const investEvents = ['peca_salva', 'lista_criada', 'peca_registrada', 'peca_cadastrada'];

    if (supabase) {
      const column = userId ? 'user_id' : 'anonymous_id';
      const { data: eventos, error } = await supabase
        .from('eventos')
        .select('event_name, created_at')
        .eq(column, targetUser)
        .in('event_name', investEvents)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!error && eventos && eventos.length > 0) {
        return res.json({
          userId: targetUser,
          primeiroInvestimentoFeito: true,
          primeiroEvento: eventos[0].event_name,
          dataPrimeiroInvestimento: eventos[0].created_at
        });
      }
    }

    const memMatch = inMemoryEvents.find(
      (e) =>
        (e.user_id === targetUser || e.anonymous_id === targetUser) &&
        investEvents.includes(e.event_name)
    );

    res.json({
      userId: targetUser,
      primeiroInvestimentoFeito: Boolean(memMatch),
      primeiroEvento: memMatch ? memMatch.event_name : null,
      dataPrimeiroInvestimento: memMatch ? memMatch.created_at : null
    });
  } catch (err) {
    console.error('Erro inesperado ao verificar primeiro investimento:', err);
    res.status(500).json({ message: 'Erro interno ao verificar status do primeiro investimento' });
  }
});

module.exports = router;
