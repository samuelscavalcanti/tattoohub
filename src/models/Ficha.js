const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');

const respostaSchema = new mongoose.Schema(
  {
    pergunta: { type: String, required: true }, // snapshot do texto no momento do preenchimento
    tipo: { type: String, enum: ['checkbox', 'texto'], required: true },
    resposta: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const fichaSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
    clienteNome: { type: String, required: true, trim: true },
    clienteTelefone: { type: String, trim: true, default: '' },
    clienteNascimento: { type: Date },
    artistaSelecionado: { type: String, trim: true, default: '' },
    respostas: [respostaSchema],
    termoAceito: { type: Boolean, required: true },
  },
  { timestamps: true }
);
fichaSchema.index({ estudio: 1, createdAt: -1 });
fichaSchema.plugin(toJSON);

module.exports = mongoose.model('Ficha', fichaSchema);
