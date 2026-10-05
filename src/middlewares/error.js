const AppError = require('../utils/AppError');

const notFound = (req, res, next) => next(new AppError(404, 'Rota não encontrada'));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let erro = err.message;
  let detalhes = err.details;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    erro = 'JSON inválido';
  } else if (err.name === 'ValidationError') {
    status = 400;
    erro = 'Dados inválidos';
    detalhes = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err.name === 'CastError') {
    status = 400;
    erro = 'ID ou valor inválido';
  } else if (err.code === 11000) {
    status = 409;
    erro = 'Registro duplicado';
  } else if (!err.status) {
    console.error(err);
    erro = 'Erro interno do servidor';
  }
  res.status(status).json({ erro, detalhes });
};

module.exports = { notFound, errorHandler };
