const router = require('express').Router();
const { requireAuth, requireRole } = require('../middlewares/auth');
const c = require('../controllers/despesaController');

router.use(requireAuth, requireRole('dono')); // dado financeiro: só o dono

router.get('/', c.listar);
router.post('/', c.criar);
router.put('/:id', c.atualizar);
router.delete('/:id', c.remover);

module.exports = router;
