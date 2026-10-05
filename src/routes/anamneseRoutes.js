const router = require('express').Router();
const ctrl = require('../controllers/anamneseController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.use(requireAuth);

// Configurar perguntas: só o dono. Ler perguntas e fichas: qualquer usuário do estúdio.
router.get('/perguntas', ctrl.listarPerguntas);
router.post('/perguntas', requireRole('dono'), ctrl.criarPergunta);
router.put('/perguntas/:id', requireRole('dono'), ctrl.atualizarPergunta);
router.patch('/perguntas/:id/ativa', requireRole('dono'), ctrl.alternarPergunta);
router.delete('/perguntas/:id', requireRole('dono'), ctrl.removerPergunta);

router.get('/fichas', ctrl.listarFichas);
router.get('/fichas/:id', ctrl.detalharFicha);

module.exports = router;
