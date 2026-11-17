const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const {
  criarListaSchema,
  adicionarItemListaSchema
} = require('../schemas/habito.schema');
const { logEvent } = require('../utils/eventLogger');
const {
  dispatchNotification,
  inMemoryListas,
  inMemoryItensLista
} = require('../utils/notificationHelper');

const hydrateItensWithPecas = async (itens) => {
  if (!supabase || !Array.isArray(itens) || itens.length === 0) return itens || [];

  return Promise.all(
    itens.map(async (item) => {
      if (item.peca_id) {
        const { data: peca } = await supabase
          .from('pecas')
          .select('id, name, category, price, image, passport_id, conservation_state, status')
          .eq('id', item.peca_id)
          .maybeSingle();
        return { ...item, peca: peca || null };
      }
      return { ...item, peca: null };
    })
  );
};

// GET /api/listas - Listar listas de desejos do usuário
router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    if (supabase) {
      const { data: listas, error: listasError } = await supabase
        .from('listas_desejos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!listasError && listas) {
        const listasComItens = await Promise.all(
          listas.map(async (lista) => {
            const { data: itens, error: itensError } = await supabase
              .from('itens_lista')
              .select('*')
              .eq('lista_id', lista.id)
              .order('added_at', { ascending: false });

            if (itensError) return { ...lista, itens: [] };
            const itensComPecas = await hydrateItensWithPecas(itens);
            return { ...lista, itens: itensComPecas };
          })
        );

        return res.json(listasComItens);
      }

      if (listasError) {
        console.warn('[Supabase GET /listas Fallback]:', listasError.message);
      }
    }

    // Fallback em memória
    const userListas = inMemoryListas.filter((l) => String(l.user_id) === String(userId));
    const listasComItens = await Promise.all(
      userListas.map(async (lista) => {
        const rawItens = inMemoryItensLista.filter((i) => String(i.lista_id) === String(lista.id));
        const itensComPecas = await hydrateItensWithPecas(rawItens);
        return { ...lista, itens: itensComPecas };
      })
    );

    res.json(listasComItens);
  } catch (err) {
    console.error('Erro inesperado ao listar listas:', err);
    res.status(500).json({ message: 'Erro interno ao listar listas de desejos' });
  }
});

// POST /api/listas - Criar nova lista de desejos (RF06 / RF16)
router.post('/', validate(criarListaSchema), async (req, res) => {
  const { userId, nome, tipo } = req.body;

  try {
    let createdLista = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('listas_desejos')
        .insert([{ user_id: userId, nome, tipo }])
        .select()
        .single();

      if (!error && data) {
        createdLista = data;
      } else if (error) {
        console.warn('[Supabase POST /listas Fallback]:', error.message);
      }
    }

    if (!createdLista) {
      createdLista = {
        id: crypto.randomUUID(),
        user_id: userId,
        nome: nome || 'Minhas peças salvas',
        tipo: tipo || 'simples',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemoryListas.unshift(createdLista);
    }

    // RF19 & Critério de Aceite 8 (B2): Registra evento `lista_criada`
    await logEvent({
      eventName: 'lista_criada',
      userId,
      origin: 'direto',
      isOwner: true,
      metadata: { listaId: createdLista.id, nome: createdLista.nome, tipo: createdLista.tipo }
    });

    await dispatchNotification({
      userId,
      tipo: 'primeiro_investimento',
      titulo: `Lista "${createdLista.nome}" criada`,
      mensagem:
        'Sua lista de desejos foi criada. Ative "Peças compatíveis" em Notificações caso queira ser avisado quando novas peças entrarem na curadoria.',
      acaoUrl: '/wishlist',
      respectPreferences: false
    });

    res.status(201).json({ ...createdLista, itens: [] });
  } catch (err) {
    console.error('Erro inesperado ao criar lista:', err);
    res.status(500).json({ message: 'Erro interno ao criar lista de desejos' });
  }
});

// POST /api/listas/itens - Adicionar peça a uma lista de desejos (RF06)
router.post('/itens', validate(adicionarItemListaSchema), async (req, res) => {
  const { listaId, pecaId, passportId, userId: bodyUserId } = req.body;
  const userId = req.query.userId || bodyUserId;

  try {
    let pecaPassportId = passportId || null;
    let pecaName = `Peça #${pecaId}`;

    if (supabase && pecaId) {
      const { data: peca } = await supabase
        .from('pecas')
        .select('name, passport_id, share_token')
        .eq('id', pecaId)
        .maybeSingle();
      if (peca) {
        pecaPassportId = pecaPassportId || peca.passport_id;
        pecaName = peca.name || pecaName;
      }
    }

    if (supabase) {
      const { data: lista, error: listaError } = await supabase
        .from('listas_desejos')
        .select('id, user_id, nome')
        .eq('id', listaId)
        .maybeSingle();

      if (!listaError && lista) {
        if (userId && String(lista.user_id) !== String(userId)) {
          return res.status(403).json({ message: 'Não autorizado a modificar esta lista' });
        }

        const { data, error } = await supabase
          .from('itens_lista')
          .insert([{ lista_id: listaId, peca_id: pecaId, passport_id: pecaPassportId }])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            return res.status(409).json({ message: 'Esta peça já está na lista de desejos' });
          }
          console.warn('[Supabase POST /listas/itens Error]:', error.message);
          return res.status(400).json({ message: 'Erro ao adicionar peça à lista', error: error.message });
        }

        await logEvent({
          eventName: 'peca_salva',
          pecaId,
          passportId: pecaPassportId,
          userId: userId || lista.user_id,
          origin: 'direto',
          isOwner: true,
          metadata: { listaId, listaNome: lista.nome }
        });

        await dispatchNotification({
          userId: userId || lista.user_id,
          tipo: 'primeiro_investimento',
          titulo: `Peça salva: ${pecaName}`,
          mensagem: `Você salvou "${pecaName}" na lista "${lista.nome}".`,
          pecaId,
          passportId: pecaPassportId,
          acaoUrl: pecaPassportId ? `/passaporte/${pecaPassportId}?origem=alerta` : `/peca/${pecaId}`,
          respectPreferences: false
        });

        return res.status(201).json(data);
      }
    }

    // Fallback em memória
    const memLista = inMemoryListas.find((l) => String(l.id) === String(listaId));
    if (!memLista) {
      return res.status(404).json({ message: 'Lista de desejos não encontrada' });
    }

    const duplicate = inMemoryItensLista.find(
      (i) => String(i.lista_id) === String(listaId) && Number(i.peca_id) === Number(pecaId)
    );
    if (duplicate) {
      return res.status(409).json({ message: 'Esta peça já está na lista de desejos' });
    }

    const newItem = {
      id: crypto.randomUUID(),
      lista_id: listaId,
      peca_id: pecaId,
      passport_id: pecaPassportId,
      added_at: new Date().toISOString()
    };
    inMemoryItensLista.unshift(newItem);

    const targetUser = userId || memLista.user_id;
    await logEvent({
      eventName: 'peca_salva',
      pecaId,
      passportId: pecaPassportId,
      userId: targetUser,
      origin: 'direto',
      isOwner: true,
      metadata: { listaId, listaNome: memLista.nome }
    });

    await dispatchNotification({
      userId: targetUser,
      tipo: 'primeiro_investimento',
      titulo: `Peça salva: ${pecaName}`,
      mensagem: `Você salvou "${pecaName}" na lista "${memLista.nome}".`,
      pecaId,
      passportId: pecaPassportId,
      acaoUrl: pecaPassportId ? `/passaporte/${pecaPassportId}?origem=alerta` : `/peca/${pecaId}`,
      respectPreferences: false
    });

    res.status(201).json(newItem);
  } catch (err) {
    console.error('Erro inesperado ao adicionar item à lista:', err);
    res.status(500).json({ message: 'Erro interno ao adicionar peça à lista de desejos' });
  }
});

// DELETE /api/listas/itens/:itemId - Remover peça de uma lista de desejos (RF06)
router.delete('/itens/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { userId } = req.query;

  try {
    if (supabase) {
      const { data: item, error: itemError } = await supabase
        .from('itens_lista')
        .select('*, listas_desejos(user_id)')
        .eq('id', itemId)
        .maybeSingle();

      if (!itemError && item) {
        if (userId && item.listas_desejos && String(item.listas_desejos.user_id) !== String(userId)) {
          return res.status(403).json({ message: 'Não autorizado a remover este item' });
        }

        const { error: deleteError } = await supabase
          .from('itens_lista')
          .delete()
          .eq('id', itemId);

        if (!deleteError) {
          return res.json({ message: 'Peça removida da lista de desejos com sucesso' });
        }
      }
    }

    // Fallback em memória
    const idx = inMemoryItensLista.findIndex((i) => String(i.id) === String(itemId));
    if (idx === -1) {
      return res.status(404).json({ message: 'Item não encontrado na lista de desejos' });
    }
    inMemoryItensLista.splice(idx, 1);

    res.json({ message: 'Peça removida da lista de desejos com sucesso' });
  } catch (err) {
    console.error('Erro inesperado ao remover item:', err);
    res.status(500).json({ message: 'Erro interno ao remover peça da lista de desejos' });
  }
});

module.exports = router;
