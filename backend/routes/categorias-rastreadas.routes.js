const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { logEvent } = require('../utils/eventLogger');

// In-memory fallback cache for tracked categories
const localTrackedCategories = [];
const TRACKED_CATEGORY_PREFIX = '__tracked_category__:';

const rowToTrackedRecord = (row) => {
  if (!row || !String(row.nome || '').startsWith(TRACKED_CATEGORY_PREFIX)) return null;
  return {
    id: row.id,
    user_id: String(row.user_id),
    categoria: String(row.nome).slice(TRACKED_CATEGORY_PREFIX.length),
    criado_em: row.created_at || new Date().toISOString()
  };
};

const fetchSupabaseTrackedFallback = async (userId = null) => {
  if (!supabase) return [];
  try {
    let query = supabase
      .from('listas_desejos')
      .select('id, user_id, nome, tipo, created_at')
      .eq('tipo', 'curadoria')
      .like('nome', `${TRACKED_CATEGORY_PREFIX}%`)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', String(userId));
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      return data.map(rowToTrackedRecord).filter(Boolean);
    }
  } catch (err) {
    console.warn('[Supabase Tracked Fallback Read Warning]:', err.message);
  }
  return [];
};

const fetchSupabaseTrackedCategories = async (userId = null) => {
  const combined = [];
  if (supabase) {
    try {
      let query = supabase
        .from('categorias_rastreadas')
        .select('*')
        .order('criado_em', { ascending: false });

      if (userId) {
        query = query.eq('user_id', String(userId));
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        combined.push(...data);
      }
    } catch (err) {
      console.warn('[Supabase categorias_rastreadas Read Warning]:', err.message);
    }

    const fallbackRows = await fetchSupabaseTrackedFallback(userId);
    combined.push(...fallbackRows);
  }
  return combined;
};

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

  // 1. Query Supabase (primary table + listas_desejos curadoria fallback)
  const dbRecords = await fetchSupabaseTrackedCategories();
  for (const record of dbRecords) {
    if (normalizeCategory(record.categoria) === normTarget) {
      matchedUserIds.add(record.user_id);
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
    // 1. Consulta Supabase (tabela dedicada + fallback listas_desejos)
    const result = await fetchSupabaseTrackedCategories(userId);

    // 2. Combina com o cache em memória
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

    // 2. Tenta verificar duplicidade e salvar no Supabase (tabela dedicada ou listas_desejos)
    let savedInSupabase = false;
    if (supabase) {
      const existingSupabase = await fetchSupabaseTrackedCategories(userId);
      const match = existingSupabase.find((item) => normalizeCategory(item.categoria) === norm);

      if (match) {
        localTrackedCategories.push(match);
        return res.status(200).json({
          message: 'Categoria já estava rastreada',
          data: match
        });
      }

      try {
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

      if (!savedInSupabase) {
        try {
          const { data: fallbackRow, error: fallbackErr } = await supabase
            .from('listas_desejos')
            .insert([
              {
                user_id: String(userId),
                nome: `${TRACKED_CATEGORY_PREFIX}${cleanCategory}`,
                tipo: 'curadoria'
              }
            ])
            .select('id, user_id, nome, tipo, created_at')
            .single();

          if (!fallbackErr && fallbackRow) {
            const converted = rowToTrackedRecord(fallbackRow);
            savedInSupabase = true;
            newRecord.id = converted.id;
            newRecord.criado_em = converted.criado_em;
            localTrackedCategories.push(converted);
          } else if (fallbackErr) {
            console.warn('[Supabase Insert tracked fallback Warning]:', fallbackErr.message);
          }
        } catch (fallbackCatchErr) {
          console.warn('[Supabase Insert tracked fallback Warning]:', fallbackCatchErr.message);
        }
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
      try {
        await supabase
          .from('categorias_rastreadas')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('[Supabase Delete categorias_rastreadas Warning]:', err.message);
      }

      try {
        await supabase
          .from('listas_desejos')
          .delete()
          .eq('id', id)
          .like('nome', `${TRACKED_CATEGORY_PREFIX}%`);
      } catch (err) {
        console.warn('[Supabase Delete tracked fallback Warning]:', err.message);
      }
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

