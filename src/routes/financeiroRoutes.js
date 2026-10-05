const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const c = require('../controllers/financeiroController');

router.use(requireAuth, requireRole('dono')); // financeiro: só o dono

router.get('/resumo', c.resumo);
router.get('/transacoes', c.transacoes);
router.get('/extrato.csv', c.extratoCsv);
router.get('/repasses', c.listarRepasses);
router.post('/repasses/:artistaId/pagar', c.pagarRepasse);

module.exports = router;
