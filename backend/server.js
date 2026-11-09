const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pecasRoutes = require('./routes/pecas.routes');
const passaportesRoutes = require('./routes/passaportes.routes');
const eventosRoutes = require('./routes/eventos.routes');
const authRoutes = require('./routes/auth.routes');
const listasRoutes = require('./routes/listas.routes');
const lembretesRoutes = require('./routes/lembretes.routes');
const notificacoesRoutes = require('./routes/notificacoes.routes');
const avaliacoesRoutes = require('./routes/avaliacoes.routes');
const transferenciasRoutes = require('./routes/transferencias.routes');
const habitoRoutes = require('./routes/habito.routes');

const app = express();

// Middlewares Globais
app.use(cors());
app.use(express.json());

// Rota de Healthcheck / Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dreVersion: '2.0-P0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Rotas da Aplicação (DRE v2.0 - Incremento P0)
app.use('/api/pecas', pecasRoutes);
app.use('/api/passaportes', passaportesRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api', authRoutes);

// Rotas da Seção 3.3 · Hábito (investimento, alertas e lembretes)
app.use('/api/listas', listasRoutes);          // RF06 - Salvar peça e lista de desejos
app.use('/api/lembretes', lembretesRoutes);    // RF09 - Configurar lembretes de conservação
app.use('/api/notificacoes', notificacoesRoutes); // RF14 - Gerenciar notificações
app.use('/api/avaliacoes', avaliacoesRoutes);  // RF07 - Avaliar contraparte
app.use('/api/transferencias', transferenciasRoutes); // RF17 - Transferência e revenda
app.use('/api/habito', habitoRoutes);          // RF16, RF10, RF29 - Convite, alertas, laudo

// Middleware para tratamento de 404
app.use((req, res) => {
  res.status(404).json({ message: `Rota ${req.method} ${req.url} não encontrada` });
});

// Middleware Global de Tratamento de Erros
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Erro interno do servidor', error: err.message });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`Lastro Backend (DRE v2.0 - P0) rodando na porta ${PORT}`);
    console.log(`URL Base: http://localhost:${PORT}/api`);
    console.log(`========================================\n`);
  });
}

module.exports = app;
