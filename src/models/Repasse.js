const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');

const repasseSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    artista: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    valor: { type: Number, required: true, min: [0.01, 'Valor do repasse inválido'] },
  },
  { timestamps: true } // createdAt = data do pagamento
);
repasseSchema.plugin(toJSON);

module.exports = mongoose.model('Repasse', repasseSchema);
