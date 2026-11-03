const { z } = require('zod');

// Catálogo mínimo de eventos da Seção 5.2 (RF19)
const VALID_EVENTS = [
  // Consulta e uso
  'passaporte_consultado',
  'laudo_aberto',
  'primeira_visita',
  'sessao_iniciada',
  // Registro
  'peca_cadastrada',
  'passaporte_publicado',
  'passaporte_atualizado',
  'peca_registrada',
  // Investimento
  'peca_salva',
  'lista_criada',
  // Alertas
  'alerta_configurado',
  'alerta_desativado',
  // Compartilhamento
  'link_gerado',
  'titularidade_transferida',
  // Transação e qualidade
  'proposta_enviada',
  'proposta_aceita',
  'pagamento_retido',
  'conferencia_aprovada',
  'conferencia_contestada',
  'curadoria_decidida'
];

// Canais de origem definidos em RF20
const VALID_ORIGINS = [
  'link_vendedor',
  'qr',
  'alerta',
  'indicacao',
  'conteudo',
  'anuncio',
  'link_compartilhado',
  'direto'
];

const createEventoSchema = z.object({
  eventName: z.enum(VALID_EVENTS, {
    required_error: 'O nome do evento (eventName) é obrigatório',
    invalid_type_error: `Evento inválido. Valores permitidos: ${VALID_EVENTS.join(', ')}`
  }),
  pecaId: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().int().positive().optional()
  ),
  passportId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  anonymousId: z.string().trim().optional(),
  origin: z
    .enum(VALID_ORIGINS)
    .optional()
    .default('direto'),
  isOwner: z.boolean().optional().default(false),
  metadata: z.record(z.string(), z.any()).optional().default({})
});

const attributionSchema = z.object({
  anonymousId: z
    .string({ required_error: 'O identificador anônimo (anonymousId) é obrigatório' })
    .trim()
    .min(3, 'O anonymousId deve ter pelo menos 3 caracteres'),
  origin: z
    .enum(VALID_ORIGINS)
    .optional()
    .default('direto'),
  passportId: z.string().trim().optional()
});

const linkOriginSchema = z.object({
  anonymousId: z
    .string({ required_error: 'O identificador anônimo (anonymousId) é obrigatório' })
    .trim()
    .min(3, 'O anonymousId deve ter pelo menos 3 caracteres'),
  userId: z
    .string({ required_error: 'O identificador do usuário (userId) é obrigatório' })
    .trim()
    .min(1, 'O userId é obrigatório')
});

module.exports = {
  VALID_EVENTS,
  VALID_ORIGINS,
  createEventoSchema,
  attributionSchema,
  linkOriginSchema
};

