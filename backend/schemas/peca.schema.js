const { z } = require('zod');
const { VALID_ORIGINS } = require('./evento.schema');

const historyEntrySchema = z.object({
  date: z.string().trim().min(1, 'A data do registro histórico é obrigatória'),
  title: z.string().trim().min(1, 'O título do evento no histórico é obrigatório'),
  details: z.string().trim().optional().default('Não informado'),
  verifiedBy: z.string().trim().optional().default('Não informado')
});

const createPecaSchema = z.object({
  name: z
    .string({ required_error: 'O nome da peça é obrigatório' })
    .trim()
    .min(3, 'O nome deve ter pelo menos 3 caracteres'),
  category: z
    .string({ required_error: 'A categoria é obrigatória' })
    .trim()
    .min(2, 'A categoria deve ter pelo menos 2 caracteres'),
  price: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? 0 : typeof val === 'string' ? parseFloat(val) : val),
    z
      .number({ invalid_type_error: 'O preço deve ser um número válido' })
      .nonnegative('O preço não pode ser negativo')
      .optional()
      .default(0)
  ),
  description: z
    .string()
    .trim()
    .optional()
    .default(''),
  image: z
    .string()
    .trim()
    .optional()
    .default('https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000&auto=format&fit=crop'),
  // Novos campos P0 do Passaporte Digital (RF03, RNF08)
  ownerId: z.string().trim().optional(),
  provenance: z.string().trim().optional(),
  conservationState: z.string().trim().optional(),
  conservationScore: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().int().min(1).max(5).optional()
  ),
  history: z.array(historyEntrySchema).optional().default([]),
  expertName: z.string().trim().optional(),
  expertDate: z.string().trim().optional(),
  isPublished: z.boolean().optional().default(true)
});

const shareLinkSchema = z.object({
  origin: z
    .enum(VALID_ORIGINS)
    .optional()
    .default('link_vendedor'),
  regenerate: z.boolean().optional().default(false),
  userId: z.string().trim().optional()
});

module.exports = {
  createPecaSchema,
  shareLinkSchema,
  historyEntrySchema
};
