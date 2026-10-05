const mongoose = require('mongoose');
const crypto = require('crypto');
const toJSON = require('../utils/toJSON');

const estudioSchema = new mongoose.Schema(
  {
    nome: { type: String, required: [true, 'Nome do estúdio é obrigatório'], trim: true, maxlength: 120 },
    // identificador público usado no link/QR da anamnese (não expõe e-mail)
    slug: { type: String, unique: true, default: () => crypto.randomBytes(8).toString('hex') },
    instagram: { type: String, trim: true, default: '', maxlength: 60 },
    plano: { type: String, enum: ['starter', 'pro'], default: 'starter' },
    mensagemOrcamento: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);
estudioSchema.plugin(toJSON);

module.exports = mongoose.model('Estudio', estudioSchema);
