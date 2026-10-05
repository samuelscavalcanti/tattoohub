const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');

const escopo = (req) => ({
  estudio: req.estudioId,
  ...(req.usuario.perfil === 'artista' ? { artista: req.usuario._id } : {}),
});

const validarStatus = (status) => {
  const value = Number(status);
  if (!Number.isInteger(value) || ![0, 1, 2].includes(value)) {
    v.falha({ status: 'Use 0 (contato), 1 (aguardando sinal) ou 2 (fechado)' });
  }
  return value;
};

async function resolverArtista(req, artistaId) {
  if (req.usuario.perfil === 'artista') return req.usuario._id;
  if (!artistaId) return null;
  if (!mongoose.isValidObjectId(artistaId)) throw new AppError(400, 'Artista inválido');
  const artista = await Usuario.findOne({
    _id: artistaId,
    estudio: req.estudioId,
    ativo: true,
    perfil: { $in: ['dono', 'artista'] },
  });
  if (!artista) throw new AppError(404, 'Artista não encontrado');
  return artista._id;
}

function formatar(lead) {
  const dados = lead.toJSON();
  const artistaId = lead.artista ? String(lead.artista._id || lead.artista) : '';
  const artistaNome = typeof lead.artista === 'object' && lead.artista ? lead.artista.nome || '' : '';
  return { ...dados, artistaId, artistaNome };
}

// GET /api/leads
exports.listar = asyncHandler(async (req, res) => {
  const leads = await Lead.find(escopo(req)).populate('artista', 'nome').sort({ updatedAt: -1 }).limit(500);
  res.json(leads.map(formatar));
});

// POST /api/leads { cliente, descricao?, estilo?, preco, artistaId?, status? }
exports.criar = asyncHandler(async (req, res) => {
  const cliente = v.str(req.body.cliente);
  const preco = Number(req.body.preco);
  if (!cliente) v.falha({ cliente: 'Informe o nome do cliente' });
  if (req.body.preco === undefined || req.body.preco === '' || !Number.isFinite(preco) || preco < 0) {
    v.falha({ preco: 'Informe um valor válido' });
  }
  const artista = await resolverArtista(req, req.body.artistaId);
  const lead = await Lead.create({
    estudio: req.estudioId,
    cliente,
    descricao: v.str(req.body.descricao),
    estilo: v.str(req.body.estilo),
    preco,
    status: req.body.status === undefined ? 0 : validarStatus(req.body.status),
    artista,
  });
  await lead.populate('artista', 'nome');
  res.status(201).json(formatar(lead));
});

// PUT /api/leads/:id
exports.atualizar = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ...escopo(req) });
  if (!lead) throw new AppError(404, 'Lead não encontrado');

  const b = req.body;
  if (b.cliente !== undefined) {
    if (!v.str(b.cliente)) v.falha({ cliente: 'Informe o nome do cliente' });
    lead.cliente = v.str(b.cliente);
  }
  if (b.descricao !== undefined) lead.descricao = v.str(b.descricao);
  if (b.estilo !== undefined) lead.estilo = v.str(b.estilo);
  if (b.preco !== undefined) {
    const preco = Number(b.preco);
    if (b.preco === '' || !Number.isFinite(preco) || preco < 0) v.falha({ preco: 'Informe um valor válido' });
    lead.preco = preco;
  }
  if (b.status !== undefined) lead.status = validarStatus(b.status);
  if (b.artistaId !== undefined) lead.artista = await resolverArtista(req, b.artistaId);
  await lead.save();
  await lead.populate('artista', 'nome');
  res.json(formatar(lead));
});

// PATCH /api/leads/:id/status { status }
exports.alterarStatus = asyncHandler(async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, ...escopo(req) });
  if (!lead) throw new AppError(404, 'Lead não encontrado');
  lead.status = validarStatus(req.body.status);
  await lead.save();
  await lead.populate('artista', 'nome');
  res.json(formatar(lead));
});

// DELETE /api/leads/:id
exports.remover = asyncHandler(async (req, res) => {
  const lead = await Lead.findOneAndDelete({ _id: req.params.id, ...escopo(req) });
  if (!lead) throw new AppError(404, 'Lead não encontrado');
  res.json({ ok: true });
});
