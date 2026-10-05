const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const c = require('../controllers/estoqueController');

router.use(requireAuth); // dono e artistas usam o estoque

router.get('/', c.listar);
router.post('/', c.criar);
router.put('/:id', c.atualizar);
router.patch('/:id/movimentar', c.movimentar);
router.delete('/:id', c.remover);

module.exports = router;
