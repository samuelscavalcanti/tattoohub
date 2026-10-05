const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/publicAnamneseController');

const limitarEnvio = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitos envios. Tente novamente mais tarde.' },
});

router.get('/:slug', ctrl.formulario);
router.post('/:slug/fichas', limitarEnvio, ctrl.enviarFicha);

module.exports = router;
