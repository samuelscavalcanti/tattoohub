const Estoque = require('../models/Estoque');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');

const CAMPOS = ['item', 'categoria', 'quantidade', 'estoqueMinimo'];
const doEstudio = (req) => ({ _id: req.params.id, estudio: req.estudioId });

// GET /api/estoque?baixo=true
exports.listar = asyncHandler(async (req, res) => {
  const itens = await Estoque.find({ estudio: req.estudioId }).sort({ createdAt: -1 });
  res.json(req.query.baixo === 'true' ? itens.filter((i) => i.status === 'Baixo') : itens);
});

// POST /api/estoque  { item, categoria?, quantidade, estoqueMinimo? }
exports.criar = asyncHandler(async (req, res) => {
  const item = await Estoque.create({ ...v.pick(req.body, CAMPOS), estudio: req.estudioId });
  res.status(201).json(item);
});

// PUT /api/estoque/:id
exports.atualizar = asyncHandler(async (req, res) => {
  const doc = await Estoque.findOneAndUpdate(doEstudio(req), v.pick(req.body, CAMPOS), {
    new: true,
    runValidators: true,
  });
  if (!doc) throw new AppError(404, 'Item não encontrado');
  res.json(doc);
});

// PATCH /api/estoque/:id/movimentar  { tipo: 'entrada' | 'saida', quantidade }
exports.movimentar = asyncHandler(async (req, res) => {
  const { tipo } = req.body;
  const q = Number(req.body.quantidade);
  if (!['entrada', 'saida'].includes(tipo) || !(q > 0)) {
    v.falha({ tipo: 'Use "entrada" ou "saida"', quantidade: 'Informe uma quantidade maior que zero' });
  }
  const filtro = doEstudio(req);
  if (tipo === 'saida') filtro.quantidade = { $gte: q }; // impede estoque negativo
  const doc = await Estoque.findOneAndUpdate(
    filtro,
    { $inc: { quantidade: tipo === 'entrada' ? q : -q } },
    { new: true }
  );
  if (!doc) throw new AppError(400, 'Item não encontrado ou estoque insuficiente');
  res.json(doc);
});

// DELETE /api/estoque/:id
exports.remover = asyncHandler(async (req, res) => {
  const doc = await Estoque.findOneAndDelete(doEstudio(req));
  if (!doc) throw new AppError(404, 'Item não encontrado');
  res.json({ ok: true });
});
