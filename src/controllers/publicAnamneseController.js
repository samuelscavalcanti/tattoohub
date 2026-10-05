// Endpoints SEM login: usados pelo cliente que escaneia o QR Code no estúdio
const Estudio = require('../models/Estudio');
const Usuario = require('../models/Usuario');
const Pergunta = require('../models/Pergunta');
const Ficha = require('../models/Ficha');
const Cliente = require('../models/Cliente');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const v = require('../utils/validate');

const buscarEstudio = async (slug) => {
  const estudio = await Estudio.findOne({ slug });
  if (!estudio) throw new AppError(404, 'Estúdio não encontrado');
  return estudio;
};

// GET /api/public/anamnese/:slug
exports.formulario = asyncHandler(async (req, res) => {
  const estudio = await buscarEstudio(req.params.slug);
  const [perguntas, artistas] = await Promise.all([
    Pergunta.find({ estudio: estudio._id, ativa: true }).sort({ ordem: 1 }),
    Usuario.find({ estudio: estudio._id, ativo: true }).select('nome').sort({ nome: 1 }),
  ]);
  res.json({
    estudio: { nome: estudio.nome },
    artistas: artistas.map((a) => a.nome),
    perguntas: perguntas.map((p) => ({
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      obrigatoria: p.obrigatoria,
    })),
  });
});

// POST /api/public/anamnese/:slug/fichas
// body: { clienteNome, clienteTelefone, clienteNascimento, artistaSelecionado, termoAceito, respostas:[{perguntaId, resposta}] }
exports.enviarFicha = asyncHandler(async (req, res) => {
  const estudio = await buscarEstudio(req.params.slug);
  const b = req.body;
  const nome = v.str(b.clienteNome);
  const telefone = v.str(b.clienteTelefone);
  const erros = {};

  if (!nome) erros.clienteNome = 'Informe seu nome';
  if (b.termoAceito !== true) erros.termoAceito = 'É necessário aceitar o termo de responsabilidade';
  let nascimento;
  if (b.clienteNascimento) {
    nascimento = new Date(b.clienteNascimento);
    if (Number.isNaN(nascimento.getTime())) erros.clienteNascimento = 'Data de nascimento inválida';
  }

  const perguntas = await Pergunta.find({ estudio: estudio._id, ativa: true }).sort({ ordem: 1 });
  const enviadas = new Map(
    (Array.isArray(b.respostas) ? b.respostas : []).map((r) => [String(r && r.perguntaId), r && r.resposta])
  );

  const respostas = perguntas.map((p) => {
    let valor = enviadas.get(String(p._id));
    if (p.obrigatoria && (valor === undefined || valor === '')) erros[`pergunta_${p.id}`] = 'Resposta obrigatória';
    valor = p.tipo === 'checkbox' ? valor === true || valor === 'true' : v.str(valor).slice(0, 1000);
    return { pergunta: p.texto, tipo: p.tipo, resposta: valor };
  });
  if (Object.keys(erros).length) v.falha(erros);

  // vincula a um cliente existente (por telefone, ou nome) ou cria um novo
  let cliente = telefone
    ? await Cliente.findOne({ estudio: estudio._id, telefone })
    : await Cliente.findOne({ estudio: estudio._id, nome: new RegExp(`^${v.escapeRegex(nome)}$`, 'i') });
  if (!cliente) cliente = new Cliente({ estudio: estudio._id, nome });
  if (telefone) cliente.telefone = telefone;
  if (nascimento) cliente.nascimento = nascimento;
  cliente.anamnese = 'Preenchida';
  await cliente.save();

  await Ficha.create({
    estudio: estudio._id,
    cliente: cliente._id,
    clienteNome: nome,
    clienteTelefone: telefone,
    clienteNascimento: nascimento,
    artistaSelecionado: v.str(b.artistaSelecionado),
    respostas,
    termoAceito: true,
  });
  res.status(201).json({ ok: true });
});
