const Despesa = require('../models/Despesa');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');
const { periodo } = require('../utils/periodo');

const CAMPOS = ['descricao', 'valor', 'categoria', 'data'];
const doEstudio = (req) => ({ _id: req.params.id, estudio: req.estudioId });

// GET /api/despesas?mes=2026-10
exports.listar = asyncHandler(async (req, res) => {
  const filtro = { estudio: req.estudioId };
  const p = periodo(req.query.mes);
  if (p) filtro.data = { $gte: p.inicioISO, $lt: p.fimISO };
  res.json(await Despesa.find(filtro).sort({ data: -1, createdAt: -1 }));
});

// POST /api/despesas  { descricao, valor, categoria?, data? }
exports.criar = asyncHandler(async (req, res) => {
  const despesa = await Despesa.create({ ...v.pick(req.body, CAMPOS), estudio: req.estudioId });
  res.status(201).json(despesa);
});

// PUT /api/despesas/:id
exports.atualizar = asyncHandler(async (req, res) => {
  const doc = await Despesa.findOneAndUpdate(doEstudio(req), v.pick(req.body, CAMPOS), {
    new: true,
    runValidators: true,
  });
  if (!doc) throw new AppError(404, 'Despesa não encontrada');
  res.json(doc);
});

// DELETE /api/despesas/:id
exports.remover = asyncHandler(async (req, res) => {
  const doc = await Despesa.findOneAndDelete(doEstudio(req));
  if (!doc) throw new AppError(404, 'Despesa não encontrada');
  res.json({ ok: true });
});
