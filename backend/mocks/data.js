/**
 * In-memory Mock Store for local testing without Supabase.
 * Toggle with USE_MOCK_DATA or automatically when Supabase credentials are empty.
 */
const { generatePassportId, generateShareToken } = require('../utils/eventLogger');

// Set to true to force mock, or null to auto-enable if Supabase is not configured
let mockEnabled = process.env.USE_MOCK !== 'false';

const initialItems = [
  {
    id: 1,
    name: 'Omega Speedmaster Professional Moonwatch',
    category: 'Relógios',
    price: 42500,
    description:
      'Um dos cronógrafos mais icônicos da história da relojoaria. Este exemplar foi usado como referência de calibração na exposição "Alta Medida" (2024, São Paulo). Acompanha caixa original, manuais, garantia de fábrica e certificado de autenticidade Lastro.',
    image:
      'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    passport_id: 'LST-MOCK001TEST',
    share_token: 'mocktoken7a3f9c2e1b4d',
    share_status: 'active',
    share_revoked_at: null,
    is_published: true,
    owner_id: 'owner_123',
    provenance:
      'Adquirido diretamente do revendedor autorizado Omega Boutique (São Paulo, 2023). Histórico de propriedade único, sem revenda anterior.',
    conservation_state: 'Excelente',
    conservation_score: 5,
    expert_name: 'Dr. Marcos Aurélio Ferreira — ABCR Nº 00142',
    expert_date: '14/09/2024',
    history: [
      {
        date: '2024',
        title: 'Inclusão no Acervo Lastro',
        details:
          'Peça cadastrada, avaliada e passaporte digital emitido com laudo do perito credenciado.',
        verifiedBy: 'Equipe Lastro'
      },
      {
        date: '2024',
        title: 'Exposição Alta Medida — São Paulo',
        details:
          'Peça exibida como referência de calibração no evento. Certificado de participação emitido.',
        verifiedBy: 'Curadoria Alta Medida'
      },
      {
        date: '2023',
        title: 'Aquisição Original',
        details:
          'Comprada no revendedor oficial Omega Boutique (Shopping Cidade Jardim, SP). Nota fiscal disponível.',
        verifiedBy: 'Omega Boutique SP'
      }
    ]
  }
];

let items = [...initialItems];

const isMockActive = (supabaseInstance) => {
  // If explicitly set, respect it.
  if (process.env.USE_MOCK === 'true') return true;
  if (process.env.USE_MOCK === 'false') return false;

  // If supabase is not initialized
  if (!supabaseInstance) return true;

  // If SUPABASE_URL is the placeholder from .env.example
  const url = process.env.SUPABASE_URL || '';
  if (!url || url.includes('your-project-id')) return true;

  return false;
};

const getMockItems = () => items;

const findMockItem = (identifier) => {
  // RNF11: Bloqueia tentativa de enumeração por ID numérico sequencial
  if (/^\d+$/.test(identifier)) {
    return { item: null, blockedSequential: true };
  }
  const item = items.find(
    (i) => i.share_token === identifier || i.passport_id === identifier
  );
  return { item: item || null, blockedSequential: false };
};

const findMockItemByIdOrPassport = (id) => {
  const isNumeric = /^\d+$/.test(id);
  if (isNumeric) {
    return items.find((i) => i.id === Number(id)) || null;
  }
  return items.find((i) => i.passport_id === id || i.share_token === id) || null;
};

const updateMockItem = (id, updates) => {
  const item = findMockItemByIdOrPassport(id);
  if (!item) return null;
  Object.assign(item, updates);
  return item;
};

const addMockItem = (newItem) => {
  const item = {
    id: items.length + 1,
    ...newItem
  };
  items.unshift(item);
  return item;
};

module.exports = {
  isMockActive,
  getMockItems,
  findMockItem,
  findMockItemByIdOrPassport,
  updateMockItem,
  addMockItem,
  MOCK_SHARE_TOKEN: 'mocktoken7a3f9c2e1b4d',
  MOCK_PASSPORT_ID: 'LST-MOCK001TEST'
};
