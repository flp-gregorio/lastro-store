const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { logEvent } = require('../utils/eventLogger');

// In-memory fallback cache for tracked categories
const localTrackedCategories = [];

/**
 * Normalizes category string to match English and Portuguese equivalents
 */
const normalizeCategory = (cat) => {
  if (!cat) return '';
  const cleaned = cat
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (cleaned === 'relogios' || cleaned === 'relogio' || cleaned === 'watch' || cleaned === 'watches') {
    return 'watches';
  }
  return cleaned;
};

/**
 * Helper to find all user IDs tracking a given category
 */
const getUsersTrackingCategory = async (categoria) => {
  const normTarget = normalizeCategory(categoria);
  const matchedUserIds = new Set();

  // 1. Try querying Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('categorias_rastreadas')
        .select('*');

      if (!error && Array.isArray(data)) {
        for (const record of data) {
          if (normalizeCategory(record.categoria) === normTarget) {
            matchedUserIds.add(record.user_id);
          }
        }
      }
    } catch (err) {
      console.warn('[Supabase getUsersTrackingCategory Error]:', err.message);
    }
  }

  // 2. Query in-memory cache
  for (const record of localTrackedCategories) {
    if (normalizeCategory(record.categoria) === normTarget) {
      matchedUserIds.add(record.user_id);
    }
  }

  return Array.from(matchedUserIds);
};

// GET /api/categorias-rastreadas - Listar categorias rastreadas do usuário
router.get('/', async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'userId é obrigatório' });
  }

  try {
    let result = [];

    // 1. Tenta Supabase
    if (supabase) {
      const { data, error } = await supabase
        .from('categorias_rastreadas')
        .select('*')
        .eq('user_id', userId)
        .order('criado_em', { ascending: false });

      if (!error && Array.isArray(data)) {
        result = data;
      }
    }

    // 2. Se vazio ou erro, combina com o cache em memória
    const fromLocal = localTrackedCategories.filter((item) => String(item.user_id) === String(userId));
    const combinedMap = new Map();

    for (const item of result) {
      combinedMap.set(normalizeCategory(item.categoria), item);
    }
    for (const item of fromLocal) {
      const norm = normalizeCategory(item.categoria);
      if (!combinedMap.has(norm)) {
        combinedMap.set(norm, item);
      }
    }

    res.json(Array.from(combinedMap.values()));
  } catch (err) {
    console.error('Erro ao listar categorias rastreadas:', err);
    res.status(500).json({ message: 'Erro interno ao consultar categorias rastreadas' });
  }
});

// POST /api/categorias-rastreadas - Adicionar ou atualizar categoria rastreada
router.post('/', async (req, res) => {
  const { userId, categoria } = req.body;

  if (!userId || !categoria) {
    return res.status(400).json({ message: 'userId e categoria são obrigatórios' });
  }

  const cleanCategory = String(categoria).trim();
  const norm = normalizeCategory(cleanCategory);

  try {
    // 1. Verificar duplicação existente no cache local
    const alreadyTrackedLocally = localTrackedCategories.find(
      (item) => String(item.user_id) === String(userId) && normalizeCategory(item.categoria) === norm
    );

    if (alreadyTrackedLocally) {
      return res.status(200).json({
        message: 'Categoria já estava rastreada',
        data: alreadyTrackedLocally
      });
    }

    const newRecord = {
      id: crypto.randomUUID(),
      user_id: String(userId),
      categoria: cleanCategory,
      criado_em: new Date().toISOString()
    };

    // 2. Tenta salvar no Supabase
    let savedInSupabase = false;
    if (supabase) {
      try {
        const { data: existingSupabase } = await supabase
          .from('categorias_rastreadas')
          .select('*')
          .eq('user_id', String(userId));

        const isDuplicateInDb = (existingSupabase || []).some(
          (item) => normalizeCategory(item.categoria) === norm
        );

        if (isDuplicateInDb) {
          const match = existingSupabase.find((item) => normalizeCategory(item.categoria) === norm);
          localTrackedCategories.push(match);
          return res.status(200).json({
            message: 'Categoria já estava rastreada',
            data: match
          });
        }

        const { data, error } = await supabase
          .from('categorias_rastreadas')
          .insert([newRecord])
          .select()
          .single();

        if (!error && data) {
          savedInSupabase = true;
          localTrackedCategories.push(data);
          newRecord.id = data.id;
        }
      } catch (dbErr) {
        console.warn('[Supabase Insert categorias_rastreadas Warning]:', dbErr.message);
      }
    }

    if (!savedInSupabase) {
      localTrackedCategories.push(newRecord);
    }

    // RF19: Registra evento `alerta_configurado`
    await logEvent({
      eventName: 'alerta_configurado',
      userId: String(userId),
      origin: 'direto',
      isOwner: true,
      metadata: { categoria: cleanCategory }
    });

    res.status(201).json({
      message: 'Categoria adicionada ao rastreamento com sucesso',
      data: newRecord
    });
  } catch (err) {
    console.error('Erro ao adicionar categoria rastreada:', err);
    res.status(500).json({ message: 'Erro interno ao adicionar categoria rastreada' });
  }
});

// DELETE /api/categorias-rastreadas/:id - Remover categoria rastreada por id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  try {
    if (supabase) {
      await supabase
        .from('categorias_rastreadas')
        .delete()
        .eq('id', id);
    }

    const idx = localTrackedCategories.findIndex(
      (item) => String(item.id) === String(id) || (userId && String(item.user_id) === String(userId) && normalizeCategory(item.categoria) === normalizeCategory(id))
    );
    if (idx !== -1) {
      localTrackedCategories.splice(idx, 1);
    }

    res.json({ message: 'Rastreamento de categoria removido com sucesso' });
  } catch (err) {
    console.error('Erro ao remover categoria rastreada:', err);
    res.status(500).json({ message: 'Erro interno ao remover categoria rastreada' });
  }
});

module.exports = {
  router,
  getUsersTrackingCategory,
  normalizeCategory
};

