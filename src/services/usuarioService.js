const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');

const hashSenha = (senha) => bcrypt.hash(senha, 10);
const verificarSenha = (senha, hash) => bcrypt.compare(senha, hash);

// Também usado pela Pessoa 2 (Equipe) para criar o login de um artista/sub-conta
async function criarUsuario({ estudioId, nome, email, senha, perfil = 'artista' }) {
  email = String(email || '').toLowerCase().trim();
  if (await Usuario.exists({ email })) throw new AppError(409, 'E-mail já cadastrado');
  const senhaHash = await hashSenha(senha);
  return Usuario.create({ estudio: estudioId, nome, email, senhaHash, perfil });
}

module.exports = { hashSenha, verificarSenha, criarUsuario };
