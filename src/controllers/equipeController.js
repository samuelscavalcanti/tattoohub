const Usuario = require('../models/Usuario');
const Membro = require('../models/Membro');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');
const { criarUsuario } = require('../services/usuarioService'); // serviço da Pessoa 1
const { limitePerfis } = require('../utils/plano');

// Junta Usuario (login, da Pessoa 1) + Membro (função e split, daqui). O "id" exposto é o do Usuario.
const montar = (u, m) => {
  const dono = u.perfil === 'dono';
  return {
    id: String(u.id || u._id),
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    avatar: u.avatar || '',
    funcao: (m && m.funcao) || (dono ? 'Proprietário' : 'Tatuador'),
    split: dono ? 100 : m && m.split !== undefined ? m.split : 0,
  };
};

const buscarUsuario = async (req) => {
  const u = await Usuario.findOne({ _id: req.params.id, estudio: req.estudioId, ativo: true });
  if (!u) throw new AppError(404, 'Membro não encontrado');
  return u;
};

// GET /api/equipe
exports.listar = asyncHandler(async (req, res) => {
  const [usuarios, perfis] = await Promise.all([
    Usuario.find({ estudio: req.estudioId, ativo: true }).sort({ createdAt: 1 }),
    Membro.find({ estudio: req.estudioId }).lean(),
  ]);
  const porUsuario = Object.fromEntries(perfis.map((p) => [String(p.usuario), p]));
  res.json({
    limite: limitePerfis(req.estudio.plano),
    total: usuarios.length,
    membros: usuarios.map((u) => montar(u, porUsuario[String(u._id)])),
  });
});

// POST /api/equipe  { nome, funcao?, split, email, senha }
exports.criar = asyncHandler(async (req, res) => {
  const b = req.body;
  const nome = v.str(b.nome);
  const email = v.str(b.email).toLowerCase();
  const funcao = v.str(b.funcao) || 'Tatuador';
  const split = Number(b.split);

  const erros = {};
  if (!nome) erros.nome = 'Informe o nome';
  if (!v.isEmail(email)) erros.email = 'E-mail inválido';
  if (typeof b.senha !== 'string' || b.senha.length < 8) erros.senha = 'Mínimo de 8 caracteres';
  if (b.split === undefined || b.split === '' || !Number.isFinite(split) || split < 0 || split > 100) {
    erros.split = 'Informe um número entre 0 e 100';
  }
  if (Object.keys(erros).length) v.falha(erros);

  // Limite do plano (Starter = 1, Pro = 5), contando o dono
  const limite = limitePerfis(req.estudio.plano);
  const ativos = await Usuario.countDocuments({ estudio: req.estudioId, ativo: true });
  if (ativos >= limite) {
    throw new AppError(403, `Limite de ${limite} perfil(is) do plano ${req.estudio.plano} atingido`);
  }

  // senha em bcrypt + e-mail único (409) já são tratados pelo serviço da Pessoa 1
  const usuario = await criarUsuario({
    estudioId: req.estudioId, nome, email, senha: b.senha, perfil: 'artista',
  });
  try {
    await Membro.create({ estudio: req.estudioId, usuario: usuario._id, funcao, split });
  } catch (e) {
    await Usuario.deleteOne({ _id: usuario._id }); // desfaz o login se o perfil falhar
    throw e;
  }
  res.status(201).json(montar(usuario, { funcao, split }));
});

// PUT /api/equipe/:id  { nome?, funcao?, split? }
exports.atualizar = asyncHandler(async (req, res) => {
  const b = req.body;
  const usuario = await buscarUsuario(req);

  if (b.nome !== undefined) {
    if (!v.str(b.nome)) v.falha({ nome: 'Nome não pode ficar vazio' });
    usuario.nome = v.str(b.nome);
    await usuario.save();
  }

  let perfil =
    (await Membro.findOne({ estudio: req.estudioId, usuario: usuario._id })) ||
    new Membro({ estudio: req.estudioId, usuario: usuario._id, split: usuario.perfil === 'dono' ? 100 : 0 });

  if (b.funcao !== undefined) perfil.funcao = v.str(b.funcao) || 'Tatuador';
  if (b.split !== undefined) {
    if (usuario.perfil === 'dono') throw new AppError(400, 'O split do proprietário não pode ser alterado');
    perfil.split = Number(b.split);
  }
  if (perfil.isNew || perfil.isModified()) await perfil.save(); // roda validações (split 0–100)

  res.json(montar(usuario, perfil));
});

// DELETE /api/equipe/:id
exports.remover = asyncHandler(async (req, res) => {
  const usuario = await buscarUsuario(req);
  if (usuario.perfil === 'dono') throw new AppError(400, 'O proprietário não pode ser removido');
  if (String(usuario._id) === String(req.usuario._id)) throw new AppError(400, 'Você não pode remover a si mesmo');

  // Desativa em vez de apagar: preserva histórico (agenda, leads, repasses). O requireAuth
  // da Pessoa 1 já bloqueia o login de usuário inativo.
  usuario.ativo = false;
  await usuario.save();
  res.json({ ok: true });
});
