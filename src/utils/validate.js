const AppError = require('./AppError');

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isData = (v) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isHora = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});
const bool = (v) => v === true || v === 'true';
const falha = (erros) => {
  throw new AppError(400, 'Dados inválidos', erros);
};

module.exports = { str, isEmail, isData, isHora, escapeRegex, pick, bool, falha };
