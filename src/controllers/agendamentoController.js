const Agendamento = require('../models/Agendamento');
const Cliente = require('../models/Cliente');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');
const { hojeISO } = require('../utils/datas');

// Artista só enxerga/mexe nos próprios agendamentos; dono vê todos do estúdio
const filtroBase = (req) => ({
  estudio: req.estudioId,
  ...(req.usuario.perfil === 'artista' ? { profissional: req.usuario._id } : {}),
});

const buscar = async (req) => {
  const ag = await Agendamento.findOne({ _id: req.params.id, ...filtroBase(req) });
  if (!ag) throw new AppError(404, 'Agendamento não encontrado');
  return ag;
};

// Usa clienteId, ou procura pelo nome; se não existir, cria o cliente (comportamento do front)
async function resolverCliente(req, b) {
  if (b.clienteId) {
    const c = await Cliente.findOne({ _id: b.clienteId, estudio: req.estudioId });
    if (!c) throw new AppError(404, 'Cliente não encontrado');
    return c;
  }
  const nome = v.str(b.clienteNome);
  let c = await Cliente.findOne({ estudio: req.estudioId, nome: new RegExp(`^${v.escapeRegex(nome)}$`, 'i') });
  if (!c) c = await Cliente.create({ estudio: req.estudioId, nome });
  return c;
}

async function resolverProfissional(req, b) {
  if (req.usuario.perfil === 'artista') return { id: req.usuario._id, nome: req.usuario.nome };
  if (b.profissionalId) {
    const u = await Usuario.findOne({ _id: b.profissionalId, estudio: req.estudioId, ativo: true });
    if (!u) throw new AppError(404, 'Profissional não encontrado');
    return { id: u._id, nome: u.nome };
  }
  return { id: null, nome: v.str(b.profissionalNome) || null };
}

// Mesmo profissional + mesmo dia + mesma hora = conflito (ignora cancelados)
async function checarConflito(estudioId, { data, hora, prof }, ignorarId) {
  if (!hora || (!prof.id && !prof.nome)) return;
  const filtro = {
    estudio: estudioId,
    data,
    hora,
    status: { $ne: 'cancelado' },
    ...(prof.id ? { profissional: prof.id } : { profissionalNome: prof.nome }),
  };
  if (ignorarId) filtro._id = { $ne: ignorarId };
  if (await Agendamento.exists(filtro)) {
    throw new AppError(409, 'Esse profissional já tem um agendamento nesse horário');
  }
}

// GET /api/agendamentos?de=AAAA-MM-DD&ate=AAAA-MM-DD&status=&profissionalId=&clienteId=
exports.listar = asyncHandler(async (req, res) => {
  const filtro = filtroBase(req);
  const { de, ate, status, profissionalId, clienteId } = req.query;
  if (de || ate) {
    filtro.data = {};
    if (de) {
      if (!v.isData(de)) v.falha({ de: 'Data inválida' });
      filtro.data.$gte = de;
    }
    if (ate) {
      if (!v.isData(ate)) v.falha({ ate: 'Data inválida' });
      filtro.data.$lte = ate;
    }
  }
  if (status) filtro.status = status;
  if (profissionalId && req.usuario.perfil === 'dono') filtro.profissional = profissionalId;
  if (clienteId) filtro.cliente = clienteId;
  res.json(await Agendamento.find(filtro).sort({ data: 1, hora: 1 }));
});

exports.detalhar = asyncHandler(async (req, res) => res.json(await buscar(req)));

// POST /api/agendamentos
exports.criar = asyncHandler(async (req, res) => {
  const b = req.body;
  const data = v.str(b.data);
  const hora = v.str(b.hora);

  const erros = {};
  if (!v.isData(data)) erros.data = 'Data inválida (use AAAA-MM-DD)';
  else if (data < hojeISO()) erros.data = 'Não é possível agendar no passado';
  if (hora && !v.isHora(hora)) erros.hora = 'Horário inválido (use HH:MM)';
  if (!b.clienteId && !v.str(b.clienteNome)) erros.cliente = 'Informe o cliente';
  if (Object.keys(erros).length) v.falha(erros);

  const cliente = await resolverCliente(req, b);
  const prof = await resolverProfissional(req, b);
  await checarConflito(req.estudioId, { data, hora, prof });

  const ag = await Agendamento.create({
    estudio: req.estudioId,
    cliente: cliente._id,
    clienteNome: cliente.nome,
    data,
    hora,
    servico: v.str(b.servico) || 'Tattoo',
    profissional: prof.id,
    profissionalNome: prof.nome,
    observacoes: v.str(b.observacoes),
  });
  res.status(201).json(ag);
});

// PUT /api/agendamentos/:id
exports.atualizar = asyncHandler(async (req, res) => {
  const ag = await buscar(req);
  const b = req.body;

  if (b.data !== undefined) {
    if (!v.isData(b.data)) v.falha({ data: 'Data inválida (use AAAA-MM-DD)' });
    ag.data = b.data;
  }
  if (b.hora !== undefined) {
    if (b.hora && !v.isHora(b.hora)) v.falha({ hora: 'Horário inválido (use HH:MM)' });
    ag.hora = b.hora || '';
  }
  if (b.servico !== undefined) ag.servico = v.str(b.servico) || 'Tattoo';
  if (b.observacoes !== undefined) ag.observacoes = v.str(b.observacoes);
  if (b.clienteId || b.clienteNome) {
    const c = await resolverCliente(req, b);
    ag.cliente = c._id;
    ag.clienteNome = c.nome;
  }
  if (b.profissionalId !== undefined || b.profissionalNome !== undefined) {
    const p = await resolverProfissional(req, b);
    ag.profissional = p.id;
    ag.profissionalNome = p.nome;
  }
  if (ag.status !== 'cancelado') {
    await checarConflito(
      req.estudioId,
      { data: ag.data, hora: ag.hora, prof: { id: ag.profissional, nome: ag.profissionalNome } },
      ag._id
    );
  }
  await ag.save();
  res.json(ag);
});

// PATCH /api/agendamentos/:id/status   body: { status }
exports.alterarStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!Agendamento.STATUS.includes(status)) {
    v.falha({ status: `Use um destes: ${Agendamento.STATUS.join(', ')}` });
  }
  const ag = await buscar(req);
  if (status !== 'cancelado' && ag.status === 'cancelado') {
    // reativar: o horário pode ter sido ocupado nesse meio tempo
    await checarConflito(
      req.estudioId,
      { data: ag.data, hora: ag.hora, prof: { id: ag.profissional, nome: ag.profissionalNome } },
      ag._id
    );
  }
  ag.status = status;
  await ag.save();
  if (status === 'concluido' && ag.cliente) {
    await Cliente.updateOne(
      { _id: ag.cliente, estudio: req.estudioId },
      { $set: { ultimaSessao: new Date(`${ag.data}T12:00:00`) } }
    );
  }
  res.json(ag);
});

// DELETE /api/agendamentos/:id
exports.remover = asyncHandler(async (req, res) => {
  const ag = await buscar(req);
  await ag.deleteOne();
  res.json({ ok: true });
});
