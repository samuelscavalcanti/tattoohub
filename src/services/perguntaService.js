const Pergunta = require('../models/Pergunta');

const PADRAO = [
  ['Possui alguma alergia a pigmentos, cosméticos ou medicamentos?', 'checkbox'],
  ['Possui algum problema de cicatrização (ex: queloide)?', 'checkbox'],
  ['É portador de diabetes, hemofilia ou problemas cardíacos?', 'checkbox'],
  ['Está gestante ou amamentando?', 'checkbox'],
  ['Está usando algum medicamento atualmente?', 'checkbox'],
  ['Observações médicas adicionais (descreva se marcou alguma opção acima):', 'texto'],
];

// Chamado no cadastro do estúdio (mesmas perguntas que o front mostra hoje)
const seedPerguntasPadrao = (estudioId) =>
  Pergunta.insertMany(
    PADRAO.map(([texto, tipo], i) => ({ estudio: estudioId, texto, tipo, ordem: i + 1 }))
  );

module.exports = { seedPerguntasPadrao };
