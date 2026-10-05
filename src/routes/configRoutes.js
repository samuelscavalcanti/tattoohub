const router = require('express').Router();
const ctrl = require('../controllers/configController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.use(requireAuth);
router.get('/', ctrl.obter);
router.put('/estudio', requireRole('dono'), ctrl.atualizarEstudio);
router.put('/perfil', ctrl.atualizarPerfil);
router.put('/senha', ctrl.alterarSenha);
router.delete('/conta', requireRole('dono'), ctrl.excluirConta);

module.exports = router;
