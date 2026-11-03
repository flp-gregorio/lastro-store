const { z } = require('zod');
const { VALID_ORIGINS } = require('./evento.schema');

const loginSchema = z.object({
  email: z
    .string({ required_error: 'O e-mail é obrigatório' })
    .trim()
    .email('Formato de e-mail inválido'),
  password: z
    .string({ required_error: 'A senha é obrigatória' })
    .min(6, 'A senha deve conter no mínimo 6 caracteres'),
  // RF20: permite vincular identificador anônimo e origem da primeira visita ao autenticar/registrar
  anonymousId: z.string().trim().optional(),
  origin: z.enum(VALID_ORIGINS).optional(),
  name: z.string().trim().optional(),
  role: z
    .enum(['Visitante', 'Comprador', 'Proprietário', 'Vendedor', 'Perito', 'Equipe Lastro'])
    .optional()
});

module.exports = {
  loginSchema
};
