const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');

const leadSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    cliente: { type: String, default: '', trim: true },
    descricao: { type: String, default: '', trim: true, maxlength: 1000 },
    estilo: { type: String, default: '', trim: true, maxlength: 80 },
    preco: { type: Number, default: 0, min: 0 },
    status: { type: Number, enum: [0, 1, 2], default: 0 },
    artista: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  },
  { timestamps: true }
);
leadSchema.plugin(toJSON);

module.exports = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
