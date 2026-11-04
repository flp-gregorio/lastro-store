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
  },
  {
    id: 2,
    name: 'Escultura "Forma & Movimento" (Série Limitada)',
    category: 'Arte',
    price: 68000,
    description:
      'Escultura em bronze patinado sobre base de mármore nero marquina, assinada e numerada 03/12. Obra premiada na Bienal de Artes Aplicadas.',
    image:
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    passport_id: 'LST-ART778899AA',
    share_token: 'mocktokenarte01234',
    share_status: 'active',
    share_revoked_at: null,
    is_published: true,
    owner_id: 'owner_123',
    provenance: 'Galeria Nara Roesler, São Paulo. Acervo de colecionador privado desde 2021.',
    conservation_state: 'Impecável',
    conservation_score: 5,
    expert_name: 'Helena von Sternberg — Curadoria Independente',
    expert_date: '20/08/2024',
    history: [
      {
        date: '2024',
        title: 'Laudo Pericial Concluído',
        details: 'Autenticidade confirmada por comparação direta com arquivos do atelier do artista.',
        verifiedBy: 'Helena von Sternberg'
      },
      {
        date: '2021',
        title: 'Aquisição em Leilão Beneficente',
        details: 'Adquirido pelo proprietário atual em leilão no MAM.',
        verifiedBy: 'MAM SP'
      }
    ]
  },
  {
    id: 3,
    name: 'Poltrona Slow Lounge — Couro Natural e Nogueira',
    category: 'Mobiliário',
    price: 34000,
    description:
      'Ícone do design modernista brasileiro confeccionado artesanalmente em nogueira maciça e estofamento em couro anilina cognac com pátina do tempo.',
    image:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    passport_id: 'LST-MOB334455BB',
    share_token: 'mocktokenmob56789',
    share_status: 'active',
    share_revoked_at: null,
    is_published: true,
    owner_id: 'owner_123',
    provenance: 'Produção original sob encomenda, Estúdio Linhares (Curitiba).',
    conservation_state: 'Muito Bom',
    conservation_score: 4,
    expert_name: 'Arq. Roberto Siqueira — Associação Brasileira de Design',
    expert_date: '10/06/2024',
    history: [
      {
        date: '2024',
        title: 'Manutenção Preventiva de Hidratação',
        details: 'Tratamento de cera natural no couro e hidratação da nogueira.',
        verifiedBy: 'Atelier de Restauro SP'
      }
    ]
  },
  {
    id: 4,
    name: 'Capricorn 01 Zagato — Edição Colecionador',
    category: 'Automotivo',
    price: 1850000,
    description:
      'Exemplar número 04 de tiragem ultralimitada com carroceria construída artesanalmente na Itália pela carrozzeria Zagato. Apenas 1.200 km originais.',
    image:
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    passport_id: 'LST-AUT991122CC',
    share_token: 'mocktokenaut99887',
    share_status: 'active',
    share_revoked_at: null,
    is_published: true,
    owner_id: 'owner_123',
    provenance: 'Importação oficial Zagato Milano. Único dono no Brasil.',
    conservation_state: 'Como Novo',
    conservation_score: 5,
    expert_name: 'Eng. Paolo Bellini — Zagato Heritage Inspector',
    expert_date: '12/01/2024',
    history: [
      {
        date: '2024',
        title: 'Certificação de Procedência Zagato',
        details: 'Dossiê técnico completo chassi #04 verificado.',
        verifiedBy: 'Zagato Milano'
      }
    ]
  },
  {
    id: 5,
    name: 'Caneta Tinteiro Montblanc Meisterstück 149 (1970s)',
    category: 'Colecionáveis',
    price: 12500,
    description:
      'Pena em ouro 14k bicolor original, alimentador de ebonita e corpo em resina preciosa preta sem fissuras. Totalmente revisada.',
    image:
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    passport_id: 'LST-COL556677DD',
    share_token: 'mocktokencol11223',
    share_status: 'active',
    share_revoked_at: null,
    is_published: true,
    owner_id: 'owner_123',
    provenance: 'Coleção particular de instrumentos de escrita rara, Genebra.',
    conservation_state: 'Excelente',
    conservation_score: 5,
    expert_name: 'Jean-Luc Dubois — Antiquário Suíço',
    expert_date: '05/03/2024',
    history: [
      {
        date: '2024',
        title: 'Teste de Escrita e Desmontagem Mecânica',
        details: 'Substituição de gaxeta de vedação de pistão por peça original de estoque antigo.',
        verifiedBy: 'Dubois Fine Pens'
      }
    ]
  }
];

let items = [...initialItems];

// In-memory registered users for mock mode
const mockUsers = [
  {
    id: '1',
    email: 'admin@lastro.com',
    name: 'ADMIN',
    role: 'Vendedor',
    created_at: new Date().toISOString()
  }
];

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

const registerMockUser = ({ email, password, name, role = 'Comprador' }) => {
  const existing = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error('Usuário já cadastrado com este e-mail');
  }
  const newUser = {
    id: `user_${Date.now()}`,
    email,
    name: name || email.split('@')[0],
    role,
    created_at: new Date().toISOString()
  };
  mockUsers.push(newUser);
  return newUser;
};

const getMockUserByEmail = (email) => {
  return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
};

module.exports = {
  isMockActive,
  getMockItems,
  findMockItem,
  findMockItemByIdOrPassport,
  updateMockItem,
  addMockItem,
  registerMockUser,
  getMockUserByEmail,
  MOCK_SHARE_TOKEN: 'mocktoken7a3f9c2e1b4d',
  MOCK_PASSPORT_ID: 'LST-MOCK001TEST'
};
