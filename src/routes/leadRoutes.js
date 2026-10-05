const router = require('express').Router();
const ctrl = require('../controllers/leadController');
const { requireAuth } = require('../middlewares/auth');

router.use(requireAuth);
router.get('/', ctrl.listar);
router.post('/', ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.patch('/:id/status', ctrl.alterarStatus);
router.delete('/:id', ctrl.remover);

module.exports = router;
