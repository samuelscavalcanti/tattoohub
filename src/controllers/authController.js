const Estudio = require('../models/Estudio');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');
const { regenerar, destruir } = require('../utils/session');
const { criarUsuario, verificarSenha } = require('../services/usuarioService');
const { seedPerguntasPadrao } = require('../services/perguntaService');

const COOKIE = 'tattoohub.sid';

const publico = (u, e) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  perfil: u.perfil,
  avatar: u.avatar,
  estudio: { id: e.id, nome: e.nome, slug: e.slug, plano: e.plano },
});

// POST /api/auth/register  -> cria estúdio + usuário dono e já loga
exports.register = asyncHandler(async (req, res) => {
  const nome = v.str(req.body.nome);
  const email = v.str(req.body.email).toLowerCase();
  const senha = req.body.senha;
  const nomeEstudio = v.str(req.body.nomeEstudio) || nome;

  const erros = {};
  if (!nome) erros.nome = 'Informe o nome';
  if (!v.isEmail(email)) erros.email = 'E-mail inválido';
  if (typeof senha !== 'string' || senha.length < 8) erros.senha = 'Mínimo de 8 caracteres';
  if (Object.keys(erros).length) v.falha(erros);

  if (await Usuario.exists({ email })) throw new AppError(409, 'E-mail já cadastrado');

  const estudio = await Estudio.create({ nome: nomeEstudio });
  let usuario;
  try {
    usuario = await criarUsuario({ estudioId: estudio._id, nome, email, senha, perfil: 'dono' });
    await seedPerguntasPadrao(estudio._id);
  } catch (e) {
    await Usuario.deleteMany({ estudio: estudio._id });
    await Estudio.deleteOne({ _id: estudio._id });
    throw e;
  }

  await regenerar(req);
  req.session.userId = usuario.id;
  res.status(201).json({ usuario: publico(usuario, estudio) });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const email = v.str(req.body.email).toLowerCase();
  const senha = req.body.senha;
  if (!v.isEmail(email) || typeof senha !== 'string' || !senha) {
    throw new AppError(400, 'Informe e-mail e senha');
  }

  const usuario = await Usuario.findOne({ email }).select('+senhaHash').populate('estudio');
  const ok = usuario && usuario.ativo && (await verificarSenha(senha, usuario.senhaHash));
  if (!ok) throw new AppError(401, 'E-mail ou senha incorretos');

  await regenerar(req); // evita session fixation
  req.session.userId = usuario.id;
  res.json({ usuario: publico(usuario, usuario.estudio) });
});

// POST /api/auth/logout
exports.logout = asyncHandler(async (req, res) => {
  await destruir(req);
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

// GET /api/auth/me  (rota protegida)
exports.me = (req, res) => res.json({ usuario: publico(req.usuario, req.estudio) });

exports.publico = publico;
