const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');

const perguntaSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    texto: { type: String, required: [true, 'Texto da pergunta é obrigatório'], trim: true, maxlength: 300 },
    tipo: { type: String, enum: ['checkbox', 'texto'], default: 'checkbox' },
    ordem: { type: Number, default: 1 },
    obrigatoria: { type: Boolean, default: false },
    ativa: { type: Boolean, default: true },
  },
  { timestamps: true }
);
perguntaSchema.plugin(toJSON);

module.exports = mongoose.model('Pergunta', perguntaSchema);
