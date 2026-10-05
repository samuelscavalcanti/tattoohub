import { get, post } from './api.js';
import { escapeHTML } from './ui.js';

const form = document.querySelector('#anamnesis-form');
const message = document.querySelector('#form-message');
const slug = new URLSearchParams(location.search).get('acc');

async function load() {
  if (!slug) throw new Error('Link de anamnese inválido.');
  const data = await get(`/public/anamnese/${encodeURIComponent(slug)}`);
  document.querySelector('#studio-title').textContent = `Anamnese · ${data.estudio.nome}`;
  document.querySelector('#selected-artist').innerHTML += data.artistas
    .map((artist) => `<option value="${escapeHTML(artist)}">${escapeHTML(artist)}</option>`).join('');
  document.querySelector('#public-questions').innerHTML = data.perguntas.map((question) => {
    const required = question.obrigatoria ? 'required' : '';
    const input = question.tipo === 'checkbox'
      ? `<select id="answer-${escapeHTML(question.id)}" ${required}><option value="">Selecione</option><option value="true">Sim</option><option value="false">Não</option></select>`
      : `<textarea id="answer-${escapeHTML(question.id)}" maxlength="1000" ${required}></textarea>`;
    return `<div class="public-field"><label for="answer-${escapeHTML(question.id)}">${escapeHTML(question.texto)}${question.obrigatoria ? ' *' : ''}</label>${input}</div>`;
  }).join('');
  form.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  try {
    const perguntas = [...document.querySelectorAll('#public-questions [id^="answer-"]')];
    const respostas = perguntas.map((input) => ({
      perguntaId: input.id.slice('answer-'.length),
      resposta: input.tagName === 'SELECT'
        ? input.value
        : input.value,
    }));
    await post(`/public/anamnese/${encodeURIComponent(slug)}/fichas`, {
      clienteNome: document.querySelector('#client-name').value.trim(),
      clienteTelefone: document.querySelector('#client-phone').value.trim(),
      clienteNascimento: document.querySelector('#client-birth').value || undefined,
      artistaSelecionado: document.querySelector('#selected-artist').value,
      termoAceito: document.querySelector('#accepted-terms').checked,
      respostas,
    });
    form.hidden = true;
    message.textContent = 'Ficha enviada com sucesso. Obrigado!';
  } catch (error) {
    message.textContent = error.message || 'Não foi possível enviar sua ficha.';
    message.style.color = 'var(--danger)';
  } finally {
    submit.disabled = false;
  }
});

load().catch((error) => {
  message.textContent = error.message || 'Não foi possível carregar a ficha.';
  message.style.color = 'var(--danger)';
});
