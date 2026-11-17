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

const CHECK_CONSTRAINT_FALLBACK_TIPO = {
  peca_pendente: 'peca_compatível',
  peca_aprovada: 'laudo_concluido'
};

const normalizeNotificationRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  const titulo = String(row.titulo || '');
  if (titulo.startsWith('Nova peça em análise:') || titulo.startsWith('Novo item em validação:')) {
    return { ...row, tipo: 'peca_pendente' };
  }
  if (titulo.startsWith('Peça verificada:') || titulo.startsWith('Peça Verificada:')) {
    return { ...row, tipo: 'peca_aprovada' };
  }
  return row;
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

  if ((tipo === 'peca_pendente' || tipo === 'peca_aprovada') && pecaId != null) {
    const existingNotifs = await listUserNotifications({ userId, limit: 50 });
    const duplicate = existingNotifs.find(
      (n) => n.tipo === tipo && Number(n.peca_id) === Number(pecaId)
    );
    if (duplicate) {
      return { sent: true, deduplicated: true, notificacao: duplicate };
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
        return { sent: true, notificacao: normalizeNotificationRow(data) };
      }

      const fallbackTipo = CHECK_CONSTRAINT_FALLBACK_TIPO[tipo];
      if (error && fallbackTipo && String(error.message || '').includes('notificacoes_tipo_check')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('notificacoes')
          .insert([{ ...rowPayload, tipo: fallbackTipo }])
          .select()
          .single();

        if (!fallbackError && fallbackData) {
          return { sent: true, notificacao: { ...fallbackData, tipo } };
        }
        if (fallbackError) {
          console.warn('[Notification Fallback Write]:', fallbackError.message);
        }
      } else if (error) {
        console.warn('[Notification Fallback Write]:', error.message);
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
 * Lista notificações de um usuário (Supabase + fallback em memória mesclados)
 */
const listUserNotifications = async ({ userId, lida, limit = 50 }) => {
  const key = String(userId);
  const maxLimit = Math.min(Number(limit) || 50, 200);
  let dbRows = [];

  try {
    if (supabase) {
      let query = supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', key)
        .order('criado_em', { ascending: false })
        .limit(maxLimit);

      if (lida !== undefined) {
        query = query.eq('lida', lida === 'true' || lida === true);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        dbRows = data.map(normalizeNotificationRow);
      }
    }
  } catch (err) {
    console.warn('[Notification Fallback List]:', err.message);
  }

  const memRows = inMemoryNotifications.filter(
    (n) => String(n.user_id) === key && (lida === undefined || n.lida === (lida === 'true' || lida === true))
  );

  const byId = new Map();
  for (const row of dbRows) {
    byId.set(String(row.id), row);
  }
  for (const row of memRows) {
    if (!byId.has(String(row.id))) {
      byId.set(String(row.id), row);
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0))
    .slice(0, maxLimit);
};

/**
 * Marca uma notificação (ou todas) como lida
 */
const markNotificationRead = async ({ id, userId, markAll = false }) => {
  const key = String(userId);
  const updatedMap = new Map();

  try {
    if (supabase) {
      let query = supabase.from('notificacoes').update({ lida: true }).eq('user_id', key);
      if (!markAll && id) {
        query = query.eq('id', id);
      }
      const { data, error } = await query.select();
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          updatedMap.set(String(row.id), normalizeNotificationRow(row));
        }
      }
    }
  } catch (err) {
    console.warn('[Notification Fallback MarkRead]:', err.message);
  }

  for (const notif of inMemoryNotifications) {
    if (String(notif.user_id) === key && (markAll || String(notif.id) === String(id))) {
      notif.lida = true;
      if (!updatedMap.has(String(notif.id))) {
        updatedMap.set(String(notif.id), notif);
      }
    }
  }

  return Array.from(updatedMap.values());
};

const normalizeCategory = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const categoriesMatch = (catA, catB) => {
  const a = normalizeCategory(catA);
  const b = normalizeCategory(catB);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  if (a.includes('arte') && b.includes('arte')) return true;
  if (
    (a === 'watches' || a === 'watch' || a === 'relogios' || a === 'relogio') &&
    (b === 'watches' || b === 'watch' || b === 'relogios' || b === 'relogio')
  ) {
    return true;
  }
  return false;
};

/**
 * Quando uma nova peça entra no acervo, notifica automaticamente os usuários
 * que possuem peças da mesma categoria na Lista de Desejos e ativaram "Peças compatíveis"
 */
const notifyCompatibleWishlistsForNewPeca = async (newPeca) => {
  if (!newPeca || !newPeca.category || !supabase) return;

  try {
    const { data: allPecas } = await supabase
      .from('pecas')
      .select('id, category');

    const matchingPecaIds = new Set(
      (allPecas || [])
        .filter((p) => Number(p.id) !== Number(newPeca.id) && categoriesMatch(p.category, newPeca.category))
        .map((p) => Number(p.id))
    );

    if (matchingPecaIds.size === 0) return;

    const targetUsers = new Set();

    const { data: itens } = await supabase
      .from('itens_lista')
      .select('peca_id, listas_desejos(user_id)');

    (itens || []).forEach((item) => {
      if (matchingPecaIds.has(Number(item.peca_id)) && item.listas_desejos?.user_id) {
        targetUsers.add(String(item.listas_desejos.user_id));
      }
    });

    inMemoryItensLista.forEach((item) => {
      if (matchingPecaIds.has(Number(item.peca_id))) {
        const lista = inMemoryListas.find((l) => String(l.id) === String(item.lista_id));
        if (lista?.user_id) targetUsers.add(String(lista.user_id));
      }
    });

    const identifier = newPeca.share_token || newPeca.passport_id;
    for (const uid of targetUsers) {
      await dispatchNotification({
        userId: uid,
        tipo: 'peca_compatível',
        titulo: `Nova peça de ${newPeca.category} compatível com sua Lista de Desejos`,
        mensagem: `A peça "${newPeca.name}" (${newPeca.category}) acabou de ser registrada na Lastro e combina com sua Lista de Desejos.`,
        pecaId: newPeca.id,
        passportId: newPeca.passport_id,
        acaoUrl: identifier ? `/passaporte/${identifier}?origem=alerta` : `/peca/${newPeca.id}`,
        respectPreferences: true
      });
    }
  } catch (err) {
    console.warn('[notifyCompatibleWishlistsForNewPeca Warning]:', err.message);
  }
};

/**
 * Verifica se já existe no catálogo uma peça compatível com os itens da Lista de Desejos
 * do usuário (que ainda não esteja na lista dele e não tenha sido notificada) e envia o alerta específico.
 */
const checkAndNotifyExistingCompatiblePecaForUser = async (userId) => {
  if (!userId || !supabase) return null;

  try {
    const prefs = await getUserPreferences(userId);
    if (!prefs.notificarPecasCompativeis) return null;

    const { data: allPecas } = await supabase
      .from('pecas')
      .select('id, name, category, passport_id, share_token')
      .order('id', { ascending: true });

    if (!allPecas || allPecas.length === 0) return null;

    const savedPecaIds = new Set();
    const { data: listas } = await supabase
      .from('listas_desejos')
      .select('id')
      .eq('user_id', String(userId));

    if (listas && listas.length > 0) {
      const listaIds = listas.map((l) => l.id);
      const { data: itens } = await supabase
        .from('itens_lista')
        .select('peca_id')
        .in('lista_id', listaIds);
      (itens || []).forEach((i) => {
        if (i.peca_id) savedPecaIds.add(Number(i.peca_id));
      });
    }

    const memListaIds = inMemoryListas
      .filter((l) => String(l.user_id) === String(userId))
      .map((l) => String(l.id));
    inMemoryItensLista
      .filter((i) => memListaIds.includes(String(i.lista_id)))
      .forEach((i) => {
        if (i.peca_id) savedPecaIds.add(Number(i.peca_id));
      });

    if (savedPecaIds.size === 0) return null;

    const savedPecas = allPecas.filter((p) => savedPecaIds.has(Number(p.id)));
    const favoriteCategories = savedPecas.map((p) => p.category).filter(Boolean);

    const existingNotifs = await listUserNotifications({ userId, limit: 50 });
    const alreadyNotifiedPecaIds = new Set(
      (existingNotifs || [])
        .filter((n) => n.tipo === 'peca_compatível' && n.peca_id)
        .map((n) => Number(n.peca_id))
    );

    const compatiblePeca = allPecas.find(
      (p) =>
        !savedPecaIds.has(Number(p.id)) &&
        !alreadyNotifiedPecaIds.has(Number(p.id)) &&
        favoriteCategories.some((favCat) => categoriesMatch(p.category, favCat))
    );

    if (!compatiblePeca) return null;

    const identifier = compatiblePeca.share_token || compatiblePeca.passport_id;
    return await dispatchNotification({
      userId,
      tipo: 'peca_compatível',
      titulo: `Peça compatível encontrada: ${compatiblePeca.name}`,
      mensagem: `Encontramos no acervo a peça "${compatiblePeca.name}" (${compatiblePeca.category}), compatível com os itens da sua Lista de Desejos.`,
      pecaId: compatiblePeca.id,
      passportId: compatiblePeca.passport_id,
      acaoUrl: identifier ? `/passaporte/${identifier}?origem=alerta` : `/peca/${compatiblePeca.id}`,
      respectPreferences: true
    });
  } catch (err) {
    console.warn('[checkAndNotifyExistingCompatiblePecaForUser Warning]:', err.message);
    return null;
  }
};

module.exports = {
  getDefaultPreferences,
  getUserPreferences,
  saveUserPreferences,
  checkNotificationAllowed,
  dispatchNotification,
  listUserNotifications,
  markNotificationRead,
  notifyCompatibleWishlistsForNewPeca,
  checkAndNotifyExistingCompatiblePecaForUser,
  inMemoryPreferences,
  inMemoryNotifications,
  inMemoryListas,
  inMemoryItensLista,
  inMemoryLembretes
};
