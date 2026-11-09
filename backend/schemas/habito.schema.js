const { z } = require('zod');
const { VALID_ORIGINS } = require('./evento.schema');

// ============================================================================
// Schemas da Seção 3.3 · Hábito (investimento, alertas e lembretes)
// RF06, RF09, RF10, RF14, RF16, RF17, RF29, RF07
// ============================================================================

// --- RF06: Salvar peça e lista de desejos ---

const criarListaSchema = z.object({
  nome: z.string().trim().min(1, 'O nome da lista é obrigatório').optional().default('Minhas peças salvas'),
  tipo: z.enum(['simples', 'curadoria']).optional().default('simples')
});

const adicionarItemListaSchema = z.object({
  listaId: z.string().uuid('ID da lista inválido'),
  pecaId: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().int().positive('ID da peça inválido')
  ),
  passportId: z.string().trim().optional()
});

const removerItemListaSchema = z.object({
  itemId: z.string().uuid('ID do item inválido')
});

// --- RF09: Configurar lembretes de conservação ---

const configurarLembreteSchema = z.object({
  pecaId: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().int().positive('ID da peça inválido')
  ),
  tipo: z.enum(['conservacao', 'revisao', 'limpeza', 'avaliacao']).optional().default('conservacao'),
  frequencia: z.enum(['mensal', 'trimestral', 'semestral', 'anual']).optional().default('semestral'),
  proximaNotificacao: z.string().datetime().optional(),
  ativo: z.boolean().optional().default(true)
});

const atualizarLembreteSchema = z.object({
  lembreteId: z.string().uuid('ID do lembrete inválido'),
  frequencia: z.enum(['mensal', 'trimestral', 'semestral', 'anual']).optional(),
  proximaNotificacao: z.string().datetime().optional(),
  ativo: z.boolean().optional()
});

// --- RF14: Gerenciar notificações / preferências ---

const preferenciasNotificacaoSchema = z.object({
  alertasAtivos: z.boolean().optional().default(false),
  lembretesAtivos: z.boolean().optional().default(false),
  notificarPecasCompativeis: z.boolean().optional().default(false),
  notificarLaudoConcluido: z.boolean().optional().default(false),
  frequenciaLembrete: z.enum(['mensal', 'trimestral', 'semestral', 'anual']).optional().default('semestral'),
  canalEmail: z.boolean().optional().default(false),
  canalPush: z.boolean().optional().default(true)
});

// --- RF16: Convite ao primeiro investimento ---

const registrarRespostaConviteSchema = z.object({
  aceito: z.boolean(),
  acao: z.enum(['salvar_peca', 'criar_lista', 'registrar_peca_propria', 'dispensar']).optional(),
  passportId: z.string().trim().optional(),
  pecaId: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().int().positive().optional()
  )
});

// --- RF10: Notificar peças compatíveis (alerta de curadoria) ---

const preferenciasAlertaCuradoriaSchema = z.object({
  notificarPecasCompativeis: z.boolean().optional().default(false),
  categoriasInteresse: z.array(z.string()).optional().default([])
});

// --- RF29: Aviso de laudo concluído ---

const notificarLaudoConcluidoSchema = z.object({
  pecaId: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().int().positive('ID da peça inválido')
  ),
  passportId: z.string().trim().optional(),
  usuarioId: z.string().trim().optional(),
  tipo: z.enum(['dono', 'vendedor']).optional().default('dono')
});

// --- RF07: Avaliar contraparte ---

const avaliarContraparteSchema = z.object({
  avaliadoId: z.string().trim().min(1, 'ID do avaliado é obrigatório'),
  pecaId: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().int().positive().optional()
  ),
  passportId: z.string().trim().optional(),
  nota: z.number().int().min(1, 'Nota mínima é 1').max(5, 'Nota máxima é 5'),
  comentario: z.string().trim().optional().default(''),
  interacaoTipo: z.enum(['consulta', 'proposta', 'negociacao', 'transferencia']),
  interacaoId: z.string().trim().optional(),
  visibilidade: z.enum(['publica', 'privada']).optional().default('publica')
});

const listarAvaliacoesSchema = z.object({
  avaliadoId: z.string().trim().optional(),
  pecaId: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().int().positive().optional()
  ),
  limit: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? 20 : Number(val)),
    z.number().int().positive().max(100).optional().default(20)
  ),
  offset: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? 0 : Number(val)),
    z.number().int().nonnegative().optional().default(0)
  )
});

// --- RF17: Transferência e revenda de passaporte ---

const transferirPassaporteSchema = z.object({
  pecaId: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().int().positive('ID da peça inválido')
  ),
  passportId: z.string().trim().min(1, 'Passaport ID é obrigatório'),
  paraUsuarioId: z.string().trim().min(1, 'ID do destinatário é obrigatório'),
  tipoTransferencia: z.enum(['venda', 'revenda', 'doacao', 'heranca']),
  valorTransacao: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : Number(val)),
    z.number().nonnegative().optional()
  ),
  observacoes: z.string().trim().optional().default('')
});

module.exports = {
  criarListaSchema,
  adicionarItemListaSchema,
  removerItemListaSchema,
  configurarLembreteSchema,
  atualizarLembreteSchema,
  preferenciasNotificacaoSchema,
  registrarRespostaConviteSchema,
  preferenciasAlertaCuradoriaSchema,
  notificarLaudoConcluidoSchema,
  avaliarContraparteSchema,
  listarAvaliacoesSchema,
  transferirPassaporteSchema
};