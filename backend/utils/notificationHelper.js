const crypto = require('crypto');
const supabase = require('../config/supabase');
const { logEvent } = require('./eventLogger');

// Stores em memória como fallback caso as tabelas da Seção 5 ainda não tenham sido criadas no Supabase
const inMemoryPreferences = new Map();
const inMemoryNotifications = [];
const inMemoryListas = [];
const inMemoryItensLista = [];
const inMemoryLembretes = [];

/**
 * RF14 & RNF06: Padrão inicial conservador (todos os gatilhos desligados por padrão)
 */
const getDefaultPreferences = (userId) => ({
  userId: String(userId),
  alertasAtivos: false,
  lembretesAtivos: false,
  notificarPecasCompativeis: false,
  notificarLaudoConcluido: false,
  frequenciaLembrete: 'semestral',
  canalEmail: false,
  canalPush: true
});

const formatPreferencesRow = (row, fallbackUserId) => ({
  userId: row.user_id || fallbackUserId,
  alertasAtivos: Boolean(row.alertas_ativos),
  lembretesAtivos: Boolean(row.lembretes_ativos),
  notificarPecasCompativeis: Boolean(row.notificar_pecas_compativeis),
  notificarLaudoConcluido: Boolean(row.notificar_laudo_concluido),
  frequenciaLembrete: row.frequencia_lembrete || 'semestral',
  canalEmail: Boolean(row.canal_email),
  canalPush: row.canal_push !== undefined ? Boolean(row.canal_push) : true
});

/**
 * Obtém as preferências de notificação do usuário (Supabase + fallback em memória)
 */
const getUserPreferences = async (userId) => {
  if (!userId) return getDefaultPreferences('anon_user');
  const key = String(userId);

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('preferencias_notificacao')
        .select('*')
        .eq('user_id', key)
        .maybeSingle();

      if (!error && data) {
        const formatted = formatPreferencesRow(data, key);
        inMemoryPreferences.set(key, formatted);
        return formatted;
      }
    }
  } catch (err) {
    console.warn('[Preferences Fallback Read]:', err.message);
  }

  if (inMemoryPreferences.has(key)) {
    return inMemoryPreferences.get(key);
  }

  return getDefaultPreferences(key);
};

/**
 * Salva as preferências de notificação do usuário (RF14) e registra evento (RF19)
 */
const saveUserPreferences = async (prefsInput) => {
  const key = String(prefsInput.userId);
  const previous = await getUserPreferences(key);

  const normalized = {
    userId: key,
    alertasAtivos: Boolean(prefsInput.alertasAtivos),
    lembretesAtivos: Boolean(prefsInput.lembretesAtivos),
    notificarPecasCompativeis: Boolean(prefsInput.notificarPecasCompativeis),
    notificarLaudoConcluido: Boolean(prefsInput.notificarLaudoConcluido),
    frequenciaLembrete: prefsInput.frequenciaLembrete || 'semestral',
    canalEmail: Boolean(prefsInput.canalEmail),
    canalPush: prefsInput.canalPush !== undefined ? Boolean(prefsInput.canalPush) : true
  };

  inMemoryPreferences.set(key, normalized);

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('preferencias_notificacao')
        .upsert(
          [
            {
              user_id: key,
              alertas_ativos: normalized.alertasAtivos,
              lembretes_ativos: normalized.lembretesAtivos,
              notificar_pecas_compativeis: normalized.notificarPecasCompativeis,
              notificar_laudo_concluido: normalized.notificarLaudoConcluido,
              frequencia_lembrete: normalized.frequenciaLembrete,
              canal_email: normalized.canalEmail,
              canal_push: normalized.canalPush,
              atualizado_em: new Date().toISOString()
            }
          ],
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (!error && data) {
        const saved = formatPreferencesRow(data, key);
        inMemoryPreferences.set(key, saved);
      }
    }
  } catch (err) {
    console.warn('[Preferences Fallback Write]:', err.message);
  }

  // RF19 & Trava P4: Registra se o usuário ativou ou desativou alertas/lembretes
  const anyActiveNow =
    normalized.alertasAtivos ||
    normalized.lembretesAtivos ||
    normalized.notificarPecasCompativeis ||
    normalized.notificarLaudoConcluido;

  const wasActiveBefore =
    previous.alertasAtivos ||
    previous.lembretesAtivos ||
    previous.notificarPecasCompativeis ||
    previous.notificarLaudoConcluido;

  const eventName =
    !anyActiveNow || (wasActiveBefore && (!normalized.alertasAtivos || !normalized.lembretesAtivos))
      ? 'alerta_desativado'
      : 'alerta_configurado';

  await logEvent({
    eventName,
    userId: key,
    origin: 'direto',
    isOwner: true,
    metadata: {
      acao: 'atualizar_preferencias',
      ...normalized
    }
  });

  return normalized;
};

/**
 * Critério de Aceite 9 (RF14):
 * "Dado que o proprietário desativou lembretes ou alertas, então nenhum novo lembrete desse tipo é enviado."
 */
const checkNotificationAllowed = (prefs, tipo) => {
  switch (tipo) {
    case 'lembrete_conservacao':
      if (!prefs.lembretesAtivos) {
        return {
          allowed: false,
          reason: 'Lembretes de conservação estão desativados nas suas preferências.'
        };
      }
      return { allowed: true };

    case 'peca_compatível':
      if (!prefs.notificarPecasCompativeis) {
        return {
          allowed: false,
          reason: 'A opção "Peças compatíveis" está desativada nas suas preferências.'
        };
      }
      return { allowed: true };

    case 'laudo_concluido':
      if (!prefs.notificarLaudoConcluido) {
        return {
          allowed: false,
          reason: 'Avisos de laudo concluído estão desativados nas suas preferências.'
        };
      }
      return { allowed: true };

    case 'alerta_generico':
      if (!prefs.alertasAtivos) {
        return {
          allowed: false,
          reason: 'Alertas gerais estão desativados nas suas preferências.'
        };
      }
      return { allowed: true };

    case 'primeiro_investimento':
    default:
      return { allowed: true };
  }
};

/**
 * Dispara e armazena uma notificação respeitando o Critério de Aceite 9 (RF14)
 */
const dispatchNotification = async ({
  userId,
  tipo,
  titulo,
  mensagem,
  pecaId = null,
  passportId = null,
  acaoUrl = null,
  respectPreferences = true
}) => {
  if (!userId) {
    return { sent: false, reason: 'userId ausente' };
  }

  const prefs = await getUserPreferences(userId);

  if (respectPreferences) {
    const check = checkNotificationAllowed(prefs, tipo);
    if (!check.allowed) {
      return {
        sent: false,
        blockedByPreferences: true,
        reason: check.reason,
        preferences: prefs
      };
    }
  }

  const resolvedActionUrl =
    acaoUrl || (passportId ? `/passaporte/${passportId}?origem=alerta` : pecaId ? `/peca/${pecaId}` : null);

  const rowPayload = {
    user_id: String(userId),
    tipo,
    titulo,
    mensagem,
    peca_id: pecaId ?? null,
    passport_id: passportId || null,
    lida: false,
    acao_url: resolvedActionUrl
  };

  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('notificacoes')
        .insert([rowPayload])
        .select()
        .single();

      if (!error && data) {
        return { sent: true, notificacao: data };
      }
    }
  } catch (err) {
    console.warn('[Notification Fallback Write]:', err.message);
  }

  const fallbackNotif = {
    id: crypto.randomUUID(),
    ...rowPayload,
    criado_em: new Date().toISOString()
  };
  inMemoryNotifications.unshift(fallbackNotif);
  return { sent: true, notificacao: fallbackNotif };
};

/**
 * Lista notificações de um usuário (Supabase + fallback em memória)
 */
const listUserNotifications = async ({ userId, lida, limit = 50 }) => {
  const key = String(userId);

  try {
    if (supabase) {
      let query = supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', key)
        .order('criado_em', { ascending: false })
        .limit(Math.min(Number(limit) || 50, 200));

      if (lida !== undefined) {
        query = query.eq('lida', lida === 'true' || lida === true);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[Notification Fallback List]:', err.message);
  }

  return inMemoryNotifications
    .filter((n) => String(n.user_id) === key && (lida === undefined || n.lida === (lida === 'true' || lida === true)))
    .slice(0, Number(limit) || 50);
};

/**
 * Marca uma notificação (ou todas) como lida
 */
const markNotificationRead = async ({ id, userId, markAll = false }) => {
  const key = String(userId);

  try {
    if (supabase) {
      let query = supabase.from('notificacoes').update({ lida: true }).eq('user_id', key);
      if (!markAll && id) {
        query = query.eq('id', id);
      }
      const { data, error } = await query.select();
      if (!error && data && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[Notification Fallback MarkRead]:', err.message);
  }

  const updated = [];
  for (const notif of inMemoryNotifications) {
    if (String(notif.user_id) === key && (markAll || String(notif.id) === String(id))) {
      notif.lida = true;
      updated.push(notif);
    }
  }
  return updated;
};

module.exports = {
  getDefaultPreferences,
  getUserPreferences,
  saveUserPreferences,
  checkNotificationAllowed,
  dispatchNotification,
  listUserNotifications,
  markNotificationRead,
  inMemoryPreferences,
  inMemoryNotifications,
  inMemoryListas,
  inMemoryItensLista,
  inMemoryLembretes
};
