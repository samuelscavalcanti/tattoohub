const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');

const estoqueSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    item: { type: String, required: [true, 'Item é obrigatório'], trim: true, maxlength: 120 },
    categoria: { type: String, default: 'Geral', trim: true, maxlength: 60 },
    quantidade: {
      type: Number,
      required: [true, 'Quantidade é obrigatória'],
      min: [0, 'Quantidade não pode ser negativa'],
      default: 0,
    },
    estoqueMinimo: { type: Number, default: 5, min: [0, 'Estoque mínimo inválido'] },
  },
  { timestamps: true }
);

// Mesmo critério do front: abaixo do mínimo (padrão 5) = "Baixo"
estoqueSchema.virtual('status').get(function () {
  return this.quantidade < this.estoqueMinimo ? 'Baixo' : 'Ok';
});
estoqueSchema.plugin(toJSON);

module.exports = mongoose.model('Estoque', estoqueSchema);
