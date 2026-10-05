const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');

const usuarioSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    nome: { type: String, required: [true, 'Nome é obrigatório'], trim: true, maxlength: 120 },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    senhaHash: { type: String, required: true, select: false },
    perfil: { type: String, enum: ['dono', 'artista'], default: 'artista' },
    avatar: { type: String, default: '' },
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);
usuarioSchema.plugin(toJSON);

module.exports = mongoose.model('Usuario', usuarioSchema);
