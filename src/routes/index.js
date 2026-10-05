const router = require('express').Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.use('/auth', require('./authRoutes'));
router.use('/public/anamnese', require('./publicAnamneseRoutes')); // sem login
router.use('/clientes', require('./clienteRoutes'));
router.use('/agendamentos', require('./agendamentoRoutes'));
router.use('/anamnese', require('./anamneseRoutes'));
router.use('/config', require('./configRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/leads', require('./leadRoutes'));

// Pessoa 2: Estoque, Financeiro/Despesas e Equipe
router.use('/estoque', require('./estoqueRoutes'));
router.use('/despesas', require('./despesaRoutes'));
router.use('/equipe', require('./equipeRoutes'));
router.use('/financeiro', require('./financeiroRoutes'));

module.exports = router;
