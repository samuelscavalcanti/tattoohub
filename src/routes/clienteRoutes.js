const router = require('express').Router();
const ctrl = require('../controllers/clienteController');
const { requireAuth } = require('../middlewares/auth');

router.use(requireAuth);
router.get('/', ctrl.listar);
router.post('/', ctrl.criar);
router.get('/:id', ctrl.detalhar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.remover);

module.exports = router;
