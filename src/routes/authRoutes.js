const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');

const limitarTentativas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

router.post('/register', limitarTentativas, ctrl.register);
router.post('/login', limitarTentativas, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
