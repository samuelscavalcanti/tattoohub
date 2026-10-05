const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');

const STATUS = ['agendado', 'confirmado', 'concluido', 'cancelado'];

const agendamentoSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
    clienteNome: { type: String, required: true, trim: true },
    // data e hora como texto ("2026-10-05" / "15:00"): comparação e conflito ficam simples
    data: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'] },
    hora: { type: String, default: '', match: [/^(([01]\d|2[0-3]):[0-5]\d)?$/, 'Horário inválido'] },
    servico: { type: String, trim: true, default: 'Tattoo' },
    profissional: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    profissionalNome: { type: String, trim: true, default: null },
    status: { type: String, enum: STATUS, default: 'agendado' },
    observacoes: { type: String, trim: true, default: '', maxlength: 1000 },
  },
  { timestamps: true }
);
agendamentoSchema.index({ estudio: 1, data: 1, hora: 1 });
agendamentoSchema.plugin(toJSON);

const Agendamento = mongoose.model('Agendamento', agendamentoSchema);
Agendamento.STATUS = STATUS;
module.exports = Agendamento;
