const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pecasRoutes = require('./routes/pecas.routes');
const passaportesRoutes = require('./routes/passaportes.routes');
const eventosRoutes = require('./routes/eventos.routes');
const authRoutes = require('./routes/auth.routes');

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
