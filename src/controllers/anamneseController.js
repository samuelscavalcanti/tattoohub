const Pergunta = require('../models/Pergunta');
const Ficha = require('../models/Ficha');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');

const buscarPergunta = async (req) => {
  const p = await Pergunta.findOne({ _id: req.params.id, estudio: req.estudioId });
  if (!p) throw new AppError(404, 'Pergunta não encontrada');
  return p;
};

// ---------- Perguntas ----------
// GET /api/anamnese/perguntas
exports.listarPerguntas = asyncHandler(async (req, res) => {
  res.json(await Pergunta.find({ estudio: req.estudioId }).sort({ ordem: 1, createdAt: 1 }));
});

// POST /api/anamnese/perguntas  { texto, tipo, obrigatoria }
exports.criarPergunta = asyncHandler(async (req, res) => {
  const texto = v.str(req.body.texto);
  if (!texto) v.falha({ texto: 'Informe o texto da pergunta' });
  const tipo = req.body.tipo === 'texto' ? 'texto' : 'checkbox';
  const ultima = await Pergunta.findOne({ estudio: req.estudioId }).sort({ ordem: -1 });
  const pergunta = await Pergunta.create({
    estudio: req.estudioId,
    texto,
    tipo,
    obrigatoria: v.bool(req.body.obrigatoria),
    ordem: ultima ? ultima.ordem + 1 : 1,
  });
  res.status(201).json(pergunta);
});

// PUT /api/anamnese/perguntas/:id  { texto, tipo, obrigatoria, ativa, ordem }
exports.atualizarPergunta = asyncHandler(async (req, res) => {
  const p = await buscarPergunta(req);
  const b = req.body;
  if (b.texto !== undefined) {
    if (!v.str(b.texto)) v.falha({ texto: 'Informe o texto da pergunta' });
    p.texto = v.str(b.texto);
  }
  if (b.tipo !== undefined) p.tipo = b.tipo === 'texto' ? 'texto' : 'checkbox';
  if (b.obrigatoria !== undefined) p.obrigatoria = v.bool(b.obrigatoria);
  if (b.ativa !== undefined) p.ativa = v.bool(b.ativa);
  if (b.ordem !== undefined && Number.isFinite(Number(b.ordem))) p.ordem = Number(b.ordem);
  await p.save();
  res.json(p);
});

// PATCH /api/anamnese/perguntas/:id/ativa  (inverte ativa/inativa, como o olhinho do front)
exports.alternarPergunta = asyncHandler(async (req, res) => {
  const p = await buscarPergunta(req);
  p.ativa = !p.ativa;
  await p.save();
  res.json(p);
});

// DELETE /api/anamnese/perguntas/:id  (fichas antigas continuam intactas: guardam o texto)
exports.removerPergunta = asyncHandler(async (req, res) => {
  const p = await buscarPergunta(req);
  await p.deleteOne();
  res.json({ ok: true });
});

// ---------- Fichas ----------
const comAlertas = (ficha) => {
  const obj = ficha.toJSON();
  obj.alertas = (obj.respostas || []).filter((r) => r.tipo === 'checkbox' && r.resposta === true).length;
  return obj;
};

// GET /api/anamnese/fichas?busca=
exports.listarFichas = asyncHandler(async (req, res) => {
  const filtro = { estudio: req.estudioId };
  const busca = v.str(req.query.busca);
  if (busca) filtro.clienteNome = new RegExp(v.escapeRegex(busca), 'i');
  const fichas = await Ficha.find(filtro).sort({ createdAt: -1 }).limit(200);
  res.json(fichas.map(comAlertas));
});

// GET /api/anamnese/fichas/:id
exports.detalharFicha = asyncHandler(async (req, res) => {
  const ficha = await Ficha.findOne({ _id: req.params.id, estudio: req.estudioId });
  if (!ficha) throw new AppError(404, 'Ficha não encontrada');
  res.json(comAlertas(ficha));
});
