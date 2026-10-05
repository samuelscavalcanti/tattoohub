const Lead = require('../models/Lead');
const Despesa = require('../models/Despesa');
const Usuario = require('../models/Usuario');
const Membro = require('../models/Membro');
const Repasse = require('../models/Repasse');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { hojeISO } = require('../utils/datas');
const { periodo, isoLocal } = require('../utils/periodo');

const FECHADO = 2; // Lead.status 2 = fechado (mesmo critério do dashboard)
const arredonda = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Mesma regra do dashboard: a data do fechamento é o updatedAt do lead.
function filtroLeads(req) {
  const f = { estudio: req.estudioId, status: FECHADO };
  const p = periodo(req.query.mes);
  if (p) f.updatedAt = { $gte: p.inicio, $lt: p.fim };
  return f;
}
function filtroDespesas(req) {
  const f = { estudio: req.estudioId };
  const p = periodo(req.query.mes);
  if (p) f.data = { $gte: p.inicioISO, $lt: p.fimISO };
  return f;
}
const somar = async (Model, match, campo) => {
  const [r] = await Model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: campo } } }]);
  return r ? r.total : 0;
};

// GET /api/financeiro/resumo?mes=2026-10  -> cards Entradas / Saídas / Lucro
exports.resumo = asyncHandler(async (req, res) => {
  const [entradas, saidas] = await Promise.all([
    somar(Lead, filtroLeads(req), '$preco'),
    somar(Despesa, filtroDespesas(req), '$valor'),
  ]);
  res.json({
    mes: req.query.mes || 'todos',
    entradas: arredonda(entradas),
    saidas: arredonda(saidas),
    lucro: arredonda(entradas - saidas),
  });
});

async function montarTransacoes(req) {
  const [leads, despesas] = await Promise.all([
    Lead.find(filtroLeads(req)).select('cliente preco updatedAt').lean(),
    Despesa.find(filtroDespesas(req)).lean(),
  ]);
  return [
    ...leads.map((l) => ({
      id: String(l._id),
      descricao: 'Tattoo - ' + (l.cliente || 'Cliente'),
      data: isoLocal(new Date(l.updatedAt)),
      tipo: 'Entrada',
      valor: l.preco,
    })),
    ...despesas.map((d) => ({
      id: String(d._id),
      descricao: d.descricao,
      data: d.data,
      tipo: 'Saída',
      valor: d.valor,
      categoria: d.categoria,
    })),
  ].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

// GET /api/financeiro/transacoes?mes=2026-10  -> tabela "Últimas Transações"
exports.transacoes = asyncHandler(async (req, res) => {
  res.json(await montarTransacoes(req));
});

// GET /api/financeiro/extrato.csv?mes=2026-10  -> botão "Exportar Extrato"
exports.extratoCsv = asyncHandler(async (req, res) => {
  const lista = await montarTransacoes(req);
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const br = (iso) => iso.split('-').reverse().join('/'); // AAAA-MM-DD -> DD/MM/AAAA
  const linhas = ['Descrição;Data;Tipo;Valor'];
  for (const t of lista) {
    const valor = (t.tipo === 'Saída' ? -t.valor : t.valor).toFixed(2).replace('.', ',');
    linhas.push([esc(t.descricao), br(t.data), t.tipo, valor].join(';'));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="extrato.csv"');
  res.send('\uFEFF' + linhas.join('\n')); // BOM para o Excel ler acentos
});

// ── REPASSES (painel "Comissionamento (Split)") ──
// devido = Σ(preco dos leads fechados do artista) × split/100 ; pendente = devido − Σ repasses pagos
async function calcularRepasses(req) {
  const estudio = req.estudioId;
  const [artistas, perfis, fechados, pagos] = await Promise.all([
    Usuario.find({ estudio, ativo: true, perfil: 'artista' }).select('nome').lean(),
    Membro.find({ estudio }).lean(),
    Lead.aggregate([
      { $match: { estudio, status: FECHADO, artista: { $ne: null } } },
      { $group: { _id: '$artista', total: { $sum: '$preco' } } },
    ]),
    Repasse.aggregate([{ $match: { estudio } }, { $group: { _id: '$artista', total: { $sum: '$valor' } } }]),
  ]);
  const mapa = (arr) => Object.fromEntries(arr.map((x) => [String(x._id), x.total]));
  const totalLeads = mapa(fechados);
  const totalPago = mapa(pagos);
  const perfilDe = Object.fromEntries(perfis.map((p) => [String(p.usuario), p]));

  return artistas.map((a) => {
    const id = String(a._id);
    const perfil = perfilDe[id];
    const split = perfil ? perfil.split : 0;
    const devido = (totalLeads[id] || 0) * (split / 100);
    const pago = totalPago[id] || 0;
    return {
      artistaId: id,
      nome: a.nome,
      funcao: perfil ? perfil.funcao : 'Tatuador',
      split,
      devido: arredonda(devido),
      pago: arredonda(pago),
      pendente: arredonda(Math.max(devido - pago, 0)),
    };
  });
}

// GET /api/financeiro/repasses
exports.listarRepasses = asyncHandler(async (req, res) => {
  res.json(await calcularRepasses(req));
});

// POST /api/financeiro/repasses/:artistaId/pagar
exports.pagarRepasse = asyncHandler(async (req, res) => {
  const item = (await calcularRepasses(req)).find((r) => r.artistaId === req.params.artistaId);
  if (!item) throw new AppError(404, 'Artista não encontrado');
  if (item.pendente <= 0) throw new AppError(400, 'Não há repasse pendente para este artista');

  const repasse = await Repasse.create({ estudio: req.estudioId, artista: item.artistaId, valor: item.pendente });
  try {
    // O pagamento também é saída de caixa: reflete no lucro
    await Despesa.create({
      estudio: req.estudioId,
      descricao: `Repasse - ${item.nome}`,
      valor: item.pendente,
      categoria: 'Repasse',
      data: hojeISO(),
    });
  } catch (e) {
    await Repasse.deleteOne({ _id: repasse._id });
    throw e;
  }
  res.status(201).json({ ok: true, repasse });
});
