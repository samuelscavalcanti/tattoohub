const mongoose = require('mongoose');
const Estudio = require('../models/Estudio');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');
const { destruir } = require('../utils/session');
const { hashSenha, verificarSenha } = require('../services/usuarioService');
const { publico } = require('./authController');

const MAX_AVATAR = 3 * 1024 * 1024; // ~2MB de imagem em base64

// GET /api/config
exports.obter = (req, res) =>
  res.json({
    usuario: publico(req.usuario, req.estudio),
    estudio: {
      nome: req.estudio.nome,
      instagram: req.estudio.instagram,
      plano: req.estudio.plano,
      slug: req.estudio.slug,
      mensagemOrcamento: req.estudio.mensagemOrcamento,
    },
  });

// PUT /api/config/estudio  (só dono)  { nome, instagram, mensagemOrcamento }
exports.atualizarEstudio = asyncHandler(async (req, res) => {
  const b = req.body;
  if (b.nome !== undefined) {
    if (!v.str(b.nome)) v.falha({ nome: 'Nome do estúdio não pode ficar vazio' });
    req.estudio.nome = v.str(b.nome);
  }
  if (b.instagram !== undefined) req.estudio.instagram = v.str(b.instagram);
  if (b.mensagemOrcamento !== undefined) req.estudio.mensagemOrcamento = String(b.mensagemOrcamento);
  await req.estudio.save();
  res.json(req.estudio);
});

// PUT /api/config/perfil  { nome, avatar }   (avatar = dataURL "data:image/..." ou "" para remover)
exports.atualizarPerfil = asyncHandler(async (req, res) => {
  const b = req.body;
  if (b.nome !== undefined) {
    if (!v.str(b.nome)) v.falha({ nome: 'Nome não pode ficar vazio' });
    req.usuario.nome = v.str(b.nome);
  }
  if (b.avatar !== undefined) {
    if (b.avatar !== '' && !(typeof b.avatar === 'string' && b.avatar.startsWith('data:image/'))) {
      v.falha({ avatar: 'Envie uma imagem válida' });
    }
    if (b.avatar.length > MAX_AVATAR) v.falha({ avatar: 'A imagem deve ter no máximo 2MB' });
    req.usuario.avatar = b.avatar;
  }
  await req.usuario.save();
  res.json({ usuario: publico(req.usuario, req.estudio) });
});

// PUT /api/config/senha  { senhaAtual, novaSenha }
exports.alterarSenha = asyncHandler(async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  if (typeof novaSenha !== 'string' || novaSenha.length < 8) v.falha({ novaSenha: 'Mínimo de 8 caracteres' });
  const u = await Usuario.findById(req.usuario._id).select('+senhaHash');
  if (!(await verificarSenha(String(senhaAtual || ''), u.senhaHash))) {
    throw new AppError(401, 'Senha atual incorreta');
  }
  u.senhaHash = await hashSenha(novaSenha);
  await u.save();
  res.json({ ok: true });
});

// DELETE /api/config/conta  (só dono)  { senha }
// Apaga o estúdio e TODOS os models que tenham o campo "estudio" (inclui os da Pessoa 2).
exports.excluirConta = asyncHandler(async (req, res) => {
  const u = await Usuario.findById(req.usuario._id).select('+senhaHash');
  if (!(await verificarSenha(String(req.body.senha || ''), u.senhaHash))) {
    throw new AppError(401, 'Senha incorreta');
  }
  for (const nome of mongoose.modelNames()) {
    if (nome === 'Estudio') continue;
    const Model = mongoose.model(nome);
    if (Model.schema.path('estudio')) await Model.deleteMany({ estudio: req.estudioId });
  }
  await Estudio.deleteOne({ _id: req.estudioId });
  await destruir(req);
  res.clearCookie('tattoohub.sid');
  res.json({ ok: true });
});
