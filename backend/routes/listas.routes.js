const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const validate = require('../middlewares/validate');
const {
  criarListaSchema,
  adicionarItemListaSchema,
  removerItemListaSchema
} = require('../schemas/habito.schema');
const { logEvent } = require('../utils/eventLogger');

// GET /api/listas - Listar listas de desejos do usuário
router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const { data: listas, error: listasError } = await supabase
      .from('listas_desejos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (listasError) {
      console.error('[Supabase GET /listas Error]:', listasError.message);
      return res.status(500).json({ message: 'Erro ao listar listas de desejos' });
    }

    const listasComItens = await Promise.all(
      (listas || []).map(async (lista) => {
        const { data: itens, error: itensError } = await supabase
          .from('itens_lista')
          .select('*')
          .eq('lista_id', lista.id)
          .order('added_at', { ascending: false });

        if (itensError) {
          return { ...lista, itens: [] };
        }

        const pecasPromises = (itens || []).map(async (item) => {
          if (item.peca_id) {
            const { data: peca } = await supabase
              .from('pecas')
              .select('id, name, category, price, image, passport_id, conservation_state, status')
              .eq('id', item.peca_id)
              .maybeSingle();
            return { ...item, peca };
          }
          return { ...item, peca: null };
        });

        const itensComPecas = await Promise.all(pecasPromises);
        return { ...lista, itens: itensComPecas };
      })
    );

    res.json(listasComItens);
  } catch (err) {
    console.error('Erro inesperado ao listar listas:', err);
    res.status(500).json({ message: 'Erro interno ao listar listas de desejos' });
  }
});

// POST /api/listas - Criar nova lista de desejos (RF06)
router.post('/', validate(criarListaSchema), async (req, res) => {
  const { userId, nome, tipo } = req.body;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'userId é obrigatório' });
    }

    const { data, error } = await supabase
      .from('listas_desejos')
      .insert([{ user_id: userId, nome, tipo }])
      .select()
      .single();

    if (error) {
      console.error('[Supabase POST /listas Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao criar lista de desejos', error: error.message });
    }

    // RF19: Registra evento `lista_criada`
    await logEvent({
      eventName: 'lista_criada',
      userId,
      origin: 'direto',
      isOwner: true,
      metadata: { listaId: data.id, nome: data.nome, tipo: data.tipo }
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro inesperado ao criar lista:', err);
    res.status(500).json({ message: 'Erro interno ao criar lista de desejos' });
  }
});

// POST /api/listas/itens - Adicionar peça a uma lista de desejos (RF06)
router.post('/itens', validate(adicionarItemListaSchema), async (req, res) => {
  const { listaId, pecaId, passportId } = req.body;
  const { userId } = req.query;

  try {
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const { data: lista, error: listaError } = await supabase
      .from('listas_desejos')
      .select('id, user_id, nome')
      .eq('id', listaId)
      .maybeSingle();

    if (listaError || !lista) {
      return res.status(404).json({ message: 'Lista de desejos não encontrada' });
    }

    if (String(lista.user_id) !== String(userId)) {
      return res.status(403).json({ message: 'Não autorizado a modificar esta lista' });
    }

    let pecaPassportId = passportId;
    if (!pecaPassportId && pecaId) {
      const { data: peca } = await supabase
        .from('pecas')
        .select('passport_id')
        .eq('id', pecaId)
        .maybeSingle();
      if (peca) pecaPassportId = peca.passport_id;
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
      console.error('[Supabase POST /listas/itens Error]:', error.message);
      return res.status(400).json({ message: 'Erro ao adicionar peça à lista', error: error.message });
    }

    // RF19: Registra evento `peca_salva`
    await logEvent({
      eventName: 'peca_salva',
      pecaId,
      passportId: pecaPassportId,
      userId,
      origin: 'direto',
      isOwner: true,
      metadata: { listaId, listaNome: lista.nome }
    });

    res.status(201).json(data);
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
    if (!supabase) {
      return res.status(500).json({ message: 'Supabase não está configurado no .env' });
    }

    const { data: item, error: itemError } = await supabase
      .from('itens_lista')
      .select('*, listas_desejos(user_id)')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError || !item) {
      return res.status(404).json({ message: 'Item não encontrado na lista de desejos' });
    }

    if (String(item.listas_desejos.user_id) !== String(userId)) {
      return res.status(403).json({ message: 'Não autorizado a remover este item' });
    }

    const { error: deleteError } = await supabase
      .from('itens_lista')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('[Supabase DELETE /listas/itens Error]:', deleteError.message);
      return res.status(400).json({ message: 'Erro ao remover item da lista' });
    }

    await logEvent({
      eventName: 'alerta_desativado',
      pecaId: item.peca_id,
      passportId: item.passport_id,
      userId,
      origin: 'direto',
      isOwner: true,
      metadata: { acao: 'remover_da_lista', listaId: item.lista_id }
    });

    res.json({ message: 'Peça removida da lista de desejos com sucesso' });
  } catch (err) {
    console.error('Erro inesperado ao remover item:', err);
    res.status(500).json({ message: 'Erro interno ao remover peça da lista de desejos' });
  }
});

module.exports = router;