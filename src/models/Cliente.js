const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');

const clienteSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    nome: { type: String, required: [true, 'Nome é obrigatório'], trim: true, maxlength: 120 },
    telefone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    nascimento: { type: Date },
    estilo: { type: String, trim: true, default: '' },
    ultimaSessao: { type: Date },
    totalGasto: { type: Number, default: 0, min: [0, 'Valor não pode ser negativo'] },
    anamnese: { type: String, enum: ['Pendente', 'Preenchida'], default: 'Pendente' },
  },
  { timestamps: true }
);
clienteSchema.index({ estudio: 1, nome: 1 });
clienteSchema.plugin(toJSON);

module.exports = mongoose.model('Cliente', clienteSchema);
