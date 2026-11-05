const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const supabase = require('../config/supabase');
const {
  generatePassportId,
  generateShareToken,
  nonInferredField
} = require('../utils/eventLogger');

const MOCK_PRODUCTS = [
  {
    name: 'Omega Speedmaster Professional Moonwatch',
    category: 'Relógios',
    price: 42500,
    description:
      'Um dos cronógrafos mais icônicos da história da relojoaria. Este exemplar foi usado como referência de calibração na exposição "Alta Medida" (2024, São Paulo). Acompanha caixa original, manuais, garantia de fábrica e certificado de autenticidade Lastro.',
    image:
      'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    provenance:
      'Adquirido diretamente do revendedor autorizado Omega Boutique (São Paulo, 2023). Histórico de propriedade único, sem revenda anterior.',
    conservation_state: 'Excelente',
    conservation_score: 5,
    expert_name: 'Dr. Marcos Aurélio Ferreira — ABCR Nº 00142',
    expert_date: '14/09/2024',
    is_published: true,
    history: [
      {
        date: '2024',
        title: 'Inclusão no Acervo Lastro',
        details: 'Peça cadastrada, avaliada e passaporte digital emitido com laudo do perito credenciado.',
        verifiedBy: 'Equipe Lastro'
      },
      {
        date: '2024',
        title: 'Exposição Alta Medida — São Paulo',
        details: 'Peça exibida como referência de calibração no evento. Certificado de participação emitido.',
        verifiedBy: 'Curadoria Alta Medida'
      },
      {
        date: '2023',
        title: 'Aquisição Original',
        details: 'Comprada no revendedor oficial Omega Boutique (Shopping Cidade Jardim, SP). Nota fiscal disponível.',
        verifiedBy: 'Omega Boutique SP'
      }
    ]
  },
  {
    name: 'Escultura "Forma & Movimento" (Série Limitada)',
    category: 'Obras de Arte',
    price: 68000,
    description:
      'Escultura em bronze patinado sobre base de mármore nero marquina, assinada e numerada 03/12. Obra premiada na Bienal de Artes Aplicadas.',
    image:
      'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    provenance: 'Galeria Nara Roesler, São Paulo. Acervo de colecionador privado desde 2021.',
    conservation_state: 'Impecável',
    conservation_score: 5,
    expert_name: 'Helena von Sternberg — Curadoria Independente',
    expert_date: '20/08/2024',
    is_published: true,
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
    name: 'Poltrona Slow Lounge — Couro Natural e Nogueira',
    category: 'Mobiliário',
    price: 34000,
    description:
      'Ícone do design modernista brasileiro confeccionado artesanalmente em nogueira maciça e estofamento em couro anilina cognac com pátina do tempo.',
    image:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    provenance: 'Produção original sob encomenda, Estúdio Linhares (Curitiba).',
    conservation_state: 'Muito Bom',
    conservation_score: 4,
    expert_name: 'Arq. Roberto Siqueira — Associação Brasileira de Design',
    expert_date: '10/06/2024',
    is_published: true,
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
    name: 'Capricorn 01 Zagato — Edição Colecionador',
    category: 'Automotivo',
    price: 1850000,
    description:
      'Exemplar número 04 de tiragem ultralimitada com carroceria construída artesanalmente na Itália pela carrozzeria Zagato. Apenas 1.200 km originais.',
    image:
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    provenance: 'Importação oficial Zagato Milano. Único dono no Brasil.',
    conservation_state: 'Como Novo',
    conservation_score: 5,
    expert_name: 'Eng. Paolo Bellini — Zagato Heritage Inspector',
    expert_date: '12/01/2024',
    is_published: true,
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
    name: 'Caneta Tinteiro Montblanc Meisterstück 149 (1970s)',
    category: 'Colecionáveis',
    price: 12500,
    description:
      'Pena em ouro 14k bicolor original, alimentador de ebonita e corpo em resina preciosa preta sem fissuras. Totalmente revisada.',
    image:
      'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?q=80&w=1200&auto=format&fit=crop',
    status: 'verificado',
    provenance: 'Coleção particular de instrumentos de escrita rara, Genebra.',
    conservation_state: 'Excelente',
    conservation_score: 5,
    expert_name: 'Jean-Luc Dubois — Antiquário Suíço',
    expert_date: '05/03/2024',
    is_published: true,
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

async function seedToSupabase() {
  if (!supabase) {
    console.error('❌ Supabase não configurado no .env');
    process.exit(1);
  }

  console.log('🌱 Verificando e inserindo produtos mock no Supabase...\n');

  for (const item of MOCK_PRODUCTS) {
    // Verifica se já existe produto com o mesmo nome para evitar duplicatas
    const { data: existing } = await supabase
      .from('pecas')
      .select('id, name, passport_id, share_token')
      .eq('name', item.name)
      .maybeSingle();

    if (existing) {
      console.log(`⏩ Já existe no banco: "${item.name}" (ID: ${existing.id}, Passport: ${existing.passport_id})`);
      continue;
    }

    const passport_id = generatePassportId();
    const share_token = generateShareToken();

    const payload = {
      ...item,
      passport_id,
      share_token,
      share_status: 'active',
      is_published: true,
      provenance: nonInferredField(item.provenance),
      conservation_state: nonInferredField(item.conservation_state),
      expert_name: nonInferredField(item.expert_name),
      expert_date: nonInferredField(item.expert_date),
      history: item.history || []
    };

    const { data, error } = await supabase
      .from('pecas')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error(`❌ Erro ao inserir "${item.name}":`, error.message);
    } else {
      console.log(`✅ Inserido com sucesso: "${data.name}" (ID: ${data.id}, Passport: ${data.passport_id})`);
    }
  }

  console.log('\n🎉 Processo de seed concluído com sucesso!');
}

seedToSupabase();
