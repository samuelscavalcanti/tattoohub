const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.get('/', requireAuth, requireRole('dono'), ctrl.obter);

module.exports = router;
