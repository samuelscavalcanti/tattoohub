const mongoose = require('mongoose');
const Agendamento = require('../models/Agendamento');
const Cliente = require('../models/Cliente');
const { hojeISO } = require('../utils/datas');

/**
 * Leads (CRM) pertencem à Pessoa 2. Para não travar, lemos o model "Lead" SE ele existir.
 * CONTRATO com a Pessoa 2: model registrado como 'Lead' com os campos
 *   estudio (ObjectId), preco (Number), status (0|1|2; 2 = Agendado/fechado), timestamps.
 * Enquanto não existir, tudo volta zerado.
 */
async function resumoCRM(estudioId) {
  const r = { receitaMes: 0, receitaAno: 0, receitaMensal: Array(12).fill(0), totalLeads: 0, fechados: 0 };
  const Lead = mongoose.models.Lead;
  if (!Lead) return r;

  const leads = await Lead.find({ estudio: estudioId }).select('preco status createdAt updatedAt').lean();
  const agora = new Date();
  r.totalLeads = leads.length;
  for (const l of leads) {
    if (l.status !== 2) continue;
    r.fechados += 1;
    const valor = Number(l.preco) || 0;
    const d = new Date(l.updatedAt || l.createdAt);
    if (d.getFullYear() !== agora.getFullYear()) continue;
    r.receitaAno += valor;
    r.receitaMensal[d.getMonth()] += valor;
    if (d.getMonth() === agora.getMonth()) r.receitaMes += valor;
  }
  return r;
}

async function montarDashboard(estudioId) {
  const hoje = hojeISO();
  const [crm, proximos, sessoes, estilos] = await Promise.all([
    resumoCRM(estudioId),
    Agendamento.find({ estudio: estudioId, data: { $gte: hoje }, status: { $in: ['agendado', 'confirmado'] } })
      .sort({ data: 1, hora: 1 })
      .limit(10)
      .lean(),
    Agendamento.countDocuments({
      estudio: estudioId,
      data: { $gte: hoje },
      status: { $in: ['agendado', 'confirmado'] },
    }),
    Cliente.aggregate([
      { $match: { estudio: estudioId, estilo: { $ne: '' } } },
      { $group: { _id: '$estilo', total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 6 },
    ]),
  ]);

  return {
    kpis: {
      faturamentoMes: crm.receitaMes,
      faturamentoAno: crm.receitaAno,
      sessoesAgendadas: sessoes,
      leads: crm.totalLeads,
      conversao: crm.totalLeads ? Math.round((crm.fechados / crm.totalLeads) * 100) : 0,
    },
    receitaMensal: crm.receitaMensal, // 12 posições, Jan..Dez
    estilos: estilos.map((e) => ({ estilo: e._id, total: e.total })),
    proximosAgendamentos: proximos.map((a) => ({
      id: a._id,
      cliente: a.clienteNome,
      data: a.data,
      hora: a.hora,
      servico: a.servico,
      profissional: a.profissionalNome,
      status: a.status,
    })),
  };
}

module.exports = { montarDashboard };
