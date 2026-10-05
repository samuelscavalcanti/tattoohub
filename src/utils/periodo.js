const AppError = require('./AppError');

const pad = (n) => String(n).padStart(2, '0');
// Date -> "AAAA-MM-DD" no fuso local do servidor (mesmo critério do utils/datas.js)
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "2026-10" -> { inicio, fim (Date, fim exclusivo), inicioISO, fimISO (strings) }.
// Sem mês retorna null (= sem filtro). Formato inválido => 400.
function periodo(mes) {
  if (mes === undefined || mes === '') return null;
  if (typeof mes !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    throw new AppError(400, 'Parâmetro "mes" deve estar no formato AAAA-MM (ex: 2026-10)');
  }
  const [ano, m] = mes.split('-').map(Number);
  const inicio = new Date(ano, m - 1, 1);
  const fim = new Date(ano, m, 1);
  return { inicio, fim, inicioISO: isoLocal(inicio), fimISO: isoLocal(fim) };
}

module.exports = { periodo, isoLocal };
