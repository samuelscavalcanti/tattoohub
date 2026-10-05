const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// Exige sessão válida e injeta req.usuario, req.estudio e req.estudioId (tenant)
const requireAuth = asyncHandler(async (req, res, next) => {
  if (!req.session.userId) throw new AppError(401, 'Não autenticado');
  const usuario = await Usuario.findById(req.session.userId).populate('estudio');
  if (!usuario || !usuario.ativo || !usuario.estudio) {
    await new Promise((ok) => req.session.destroy(ok));
    throw new AppError(401, 'Sessão inválida');
  }
  req.usuario = usuario;
  req.estudio = usuario.estudio;
  req.estudioId = usuario.estudio._id;
  next();
});

// Autorização por perfil: requireRole('dono')
const requireRole = (...perfis) => (req, res, next) =>
  perfis.includes(req.usuario.perfil) ? next() : next(new AppError(403, 'Sem permissão'));

module.exports = { requireAuth, requireRole };
