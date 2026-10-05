const mongoose = require('mongoose');
const toJSON = require('../utils/toJSON');
const { hojeISO } = require('../utils/datas');

const CATEGORIAS = ['Aluguel', 'Material', 'Marketing', 'Equipe', 'Repasse', 'Outros'];

const despesaSchema = new mongoose.Schema(
  {
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: 'Estudio', required: true, index: true },
    descricao: { type: String, required: [true, 'Descrição é obrigatória'], trim: true, maxlength: 160 },
    valor: { type: Number, required: [true, 'Valor é obrigatório'], min: [0.01, 'Valor deve ser maior que zero'] },
    categoria: { type: String, enum: { values: CATEGORIAS, message: 'Categoria inválida' }, default: 'Outros' },
    // texto "AAAA-MM-DD" (mesmo padrão do Agendamento): evita erro de fuso e simplifica filtro por mês
    data: {
      type: String,
      default: hojeISO,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)'],
    },
  },
  { timestamps: true }
);
despesaSchema.index({ estudio: 1, data: -1 });
despesaSchema.plugin(toJSON);

const Despesa = mongoose.model('Despesa', despesaSchema);
Despesa.CATEGORIAS = CATEGORIAS;
module.exports = Despesa;
