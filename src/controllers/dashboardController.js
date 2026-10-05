const asyncHandler = require('../utils/asyncHandler');
const { montarDashboard } = require('../services/dashboardService');

// GET /api/dashboard  (só dono)
exports.obter = asyncHandler(async (req, res) => {
  res.json(await montarDashboard(req.estudioId));
});
