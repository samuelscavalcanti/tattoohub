const Cliente = require('../models/Cliente');
const Agendamento = require('../models/Agendamento');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');

const CAMPOS = ['nome', 'telefone', 'email', 'nascimento', 'estilo', 'totalGasto', 'ultimaSessao'];

const buscar = async (req) => {
  const cliente = await Cliente.findOne({ _id: req.params.id, estudio: req.estudioId });
  if (!cliente) throw new AppError(404, 'Cliente não encontrado');
  return cliente;
};

// GET /api/clientes?busca=&page=&limit=
exports.listar = asyncHandler(async (req, res) => {
  const filtro = { estudio: req.estudioId };
  const busca = v.str(req.query.busca);
  if (busca) {
    const rx = new RegExp(v.escapeRegex(busca), 'i');
    filtro.$or = [{ nome: rx }, { telefone: rx }, { email: rx }];
  }
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

  const [dados, total] = await Promise.all([
    Cliente.find(filtro).sort({ nome: 1 }).skip((page - 1) * limit).limit(limit),
    Cliente.countDocuments(filtro),
  ]);
  res.json({ dados, total, page, limit });
});

// GET /api/clientes/:id
exports.detalhar = asyncHandler(async (req, res) => {
  res.json(await buscar(req));
});

// POST /api/clientes
exports.criar = asyncHandler(async (req, res) => {
  const dados = v.pick(req.body, CAMPOS);
  dados.nome = v.str(dados.nome);
  if (!dados.nome) v.falha({ nome: 'Informe o nome do cliente' });
  const cliente = await Cliente.create({ ...dados, estudio: req.estudioId });
  res.status(201).json(cliente);
});

// PUT /api/clientes/:id
exports.atualizar = asyncHandler(async (req, res) => {
  const cliente = await buscar(req);
  const dados = v.pick(req.body, CAMPOS);
  if (dados.nome !== undefined && !v.str(dados.nome)) v.falha({ nome: 'Nome não pode ficar vazio' });
  cliente.set(dados);
  await cliente.save(); // roda validações do schema
  res.json(cliente);
});

// DELETE /api/clientes/:id
exports.remover = asyncHandler(async (req, res) => {
  const cliente = await buscar(req);
  await cliente.deleteOne();
  // mantém o histórico da agenda (clienteNome fica gravado), só desfaz o vínculo
  await Agendamento.updateMany({ estudio: req.estudioId, cliente: cliente._id }, { $set: { cliente: null } });
  res.json({ ok: true });
});
