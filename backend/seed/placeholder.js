/**
 * Seed: Cria 1 produto placeholder para teste do Passaporte Digital
 * DRE v2.0 — Incremento P0
 *
 * Uso: node backend/seed/placeholder.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const supabase = require('../config/supabase');
const {
  generatePassportId,
  generateShareToken,
  nonInferredField,
} = require('../utils/eventLogger');

const PLACEHOLDER = {
  name: 'Omega Speedmaster Professional Moonwatch',
  category: 'Relógios',
  price: 42500,
  description:
    'Um dos cronógrafos mais icônicos da história da relojoaria. Este exemplar foi usado como referência de calibração na exposição "Alta Medida" (2024, São Paulo). Acompanha caixa original, manuais, garantia de fábrica e certificado de autenticidade Lastro.',
  image:
    'https://raw.githubusercontent.com/nnmsg/atelier-noir-assets/main/placeholders/omega-speedmaster.jpg',
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
      details:
        'Peça cadastrada, avaliada e passaporte digital emitido com laudo do perito credenciado.',
      verifiedBy: 'Equipe Lastro',
    },
    {
      date: '2024',
      title: 'Exposição Alta Medida — São Paulo',
      details:
        'Peça exibida como referência de calibração no evento. Certificado de participação emitido.',
      verifiedBy: 'Curadoria Alta Medida',
    },
    {
      date: '2023',
      title: 'Aquisição Original',
      details:
        'Comprada no revendedor oficial Omega Boutique (Shopping Cidade Jardim, SP). Nota fiscal disponível.',
      verifiedBy: 'Omega Boutique SP',
    },
  ],
};

async function seed() {
  if (!supabase) {
    console.error('❌ Supabase não configurado. Verifique o arquivo .env');
    process.exit(1);
  }

  console.log('🌱 Criando produto placeholder...\n');

  const passport_id = generatePassportId();
  const share_token = generateShareToken();

  const payload = {
    ...PLACEHOLDER,
    passport_id,
    share_token,
    share_status: 'active',
    provenance: nonInferredField(PLACEHOLDER.provenance),
    conservation_state: nonInferredField(PLACEHOLDER.conservation_state),
    expert_name: nonInferredField(PLACEHOLDER.expert_name),
    expert_date: nonInferredField(PLACEHOLDER.expert_date),
  };

  const { data, error } = await supabase
    .from('pecas')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao inserir no Supabase:', error.message);
    console.log('\n💡 Dica: Verifique se a migração schema_p0_dre_v2.sql foi executada no Supabase.');
    process.exit(1);
  }

  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  const passportUrl = `${frontendBase}/passaporte/${share_token}?origem=link_vendedor`;

  console.log('✅ Produto placeholder criado com sucesso!\n');
  console.log('────────────────────────────────────────');
  console.log(`Nome:         ${data.name}`);
  console.log(`ID interno:   ${data.id}`);
  console.log(`Passport ID:  ${data.passport_id}`);
  console.log(`Share Token:  ${data.share_token}`);
  console.log(`\n🔗 URL do Passaporte:`);
  console.log(`   ${passportUrl}`);
  console.log('────────────────────────────────────────\n');
}

seed();

