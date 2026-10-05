const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');

// Dados financeiros/de função de um artista. O LOGIN do artista fica em Usuario (Pessoa 1);
// aqui só guardamos o que é da Equipe: função e % de comissão (split).
const membroSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
    funcao: { type: String, default: 'Tatuador', trim: true, maxlength: 60 },
    split: {
      type: Number,
      required: [true, 'Split é obrigatório'],
      min: [0, 'Split mínimo é 0'],
      max: [100, 'Split máximo é 100'],
    },
  },
  { timestamps: true }
);
membroSchema.plugin(toJSON);

module.exports = mongoose.model('Membro', membroSchema);
