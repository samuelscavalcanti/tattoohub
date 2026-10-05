import { del, get, patch, post, put } from '../api.js';
import { session } from '../auth.js';
import { $, closeModal, emptyRow, escapeHTML, openModal, showError, toast } from '../ui.js';

let questions = [];
let forms = [];

export function publicFormUrl() {
  const slug = session?.estudio?.slug;
  return slug ? `${location.origin}/anamnese.html?acc=${encodeURIComponent(slug)}` : '';
}

function renderQuestions() {
  $('#perguntas-list').innerHTML = questions.length
    ? questions.map((question, index) => `<div style="display:flex;align-items:center;gap:10px;padding:0.9rem 1rem;background:var(--bg-base);border:1px solid var(--border-color);border-radius:8px;${question.ativa ? '' : 'opacity:0.45;'}">
        <span style="font-size:0.7rem;color:var(--text-muted);min-width:20px;text-align:center;">${index + 1}</span>
        <span style="flex:1;font-size:0.88rem;">${escapeHTML(question.texto)} ${question.obrigatoria ? '<strong style="color:var(--primary);font-size:0.7rem;">* obrigatória</strong>' : ''}</span>
        <span class="tag">${question.tipo === 'checkbox' ? 'Sim/Não' : 'Texto'}</span>
        <button class="icon-btn" data-action="question-edit" data-id="${escapeHTML(question.id)}" title="Editar"><i class="ri-pencil-line"></i></button>
        <button class="icon-btn" data-action="question-toggle" data-id="${escapeHTML(question.id)}" title="${question.ativa ? 'Desativar' : 'Ativar'}"><i class="ri-${question.ativa ? 'eye-line' : 'eye-off-line'}"></i></button>
        <button class="icon-btn" data-action="question-delete" data-id="${escapeHTML(question.id)}" title="Excluir"><i class="ri-delete-bin-line" style="color:var(--danger)"></i></button>
      </div>`).join('')
    : '<div style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhuma pergunta configurada. Adicione uma pergunta para começar.</div>';
}

export async function loadQuestions() {
  try {
    questions = await get('/anamnese/perguntas');
    renderQuestions();
  } catch (error) {
    showError(error);
  }
}

export async function loadForms() {
  try {
    forms = await get('/anamnese/fichas');
    $('#fichas-list').innerHTML = forms.length
      ? forms.map((form) => `<tr>
          <td>${escapeHTML(form.clienteNome)}</td>
          <td>${escapeHTML(form.clienteTelefone || '—')}</td>
          <td>${escapeHTML(form.artistaSelecionado || '—')}</td>
          <td>${form.alertas || 0}</td>
          <td>${new Date(form.createdAt).toLocaleDateString('pt-BR')}</td>
          <td><button class="icon-btn" data-action="form-view" data-id="${escapeHTML(form.id)}" title="Ver ficha"><i class="ri-eye-line"></i></button></td>
        </tr>`).join('')
      : emptyRow(6, 'Nenhuma ficha preenchida.');
  } catch (error) {
    showError(error);
  }
}

function clearQuestionForm() {
  $('#perg-edit-id').value = '';
  $('#perg-texto').value = '';
  $('#perg-tipo').value = 'checkbox';
  $('#perg-obrig').value = 'false';
  $('#perg-modal-title').textContent = 'Nova Pergunta';
}

function editQuestion(id) {
  const question = questions.find((item) => item.id === id);
  if (!question) return;
  $('#perg-edit-id').value = question.id;
  $('#perg-texto').value = question.texto;
  $('#perg-tipo').value = question.tipo;
  $('#perg-obrig').value = String(question.obrigatoria);
  $('#perg-modal-title').textContent = 'Editar Pergunta';
  openModal('pergunta-modal');
}

async function saveQuestion() {
  const id = $('#perg-edit-id').value;
  const body = {
    texto: $('#perg-texto').value.trim(),
    tipo: $('#perg-tipo').value,
    obrigatoria: $('#perg-obrig').value === 'true',
  };
  try {
    if (id) await put(`/anamnese/perguntas/${encodeURIComponent(id)}`, body);
    else await post('/anamnese/perguntas', body);
    closeModal('pergunta-modal');
    clearQuestionForm();
    await loadQuestions();
    toast('Pergunta salva.');
  } catch (error) {
    showError(error);
  }
}

function viewForm(id) {
  const form = forms.find((item) => item.id === id);
  if (!form) return;
  $('#ficha-detail-content').innerHTML = `<p><strong>Cliente:</strong> ${escapeHTML(form.clienteNome)}</p>
    <p><strong>Telefone:</strong> ${escapeHTML(form.clienteTelefone || '—')}</p>
    <p><strong>Artista:</strong> ${escapeHTML(form.artistaSelecionado || '—')}</p>
    <p><strong>Data:</strong> ${new Date(form.createdAt).toLocaleString('pt-BR')}</p>
    <hr style="margin:1rem 0;">
    ${(form.respostas || []).map((answer) => `<div style="margin:0.8rem 0;"><strong>${escapeHTML(answer.pergunta)}</strong><br>${escapeHTML(answer.tipo === 'checkbox' ? (answer.resposta ? 'Sim' : 'Não') : answer.resposta || '—')}</div>`).join('')}`;
  openModal('ficha-detail-modal');
}

function setupPublicLink() {
  const url = publicFormUrl();
  if (!url) return;
  $('#qr-url-display').textContent = url;
  $('#qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=1a1a1a&margin=10`;
  $('#copy-link-btn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado.');
    } catch (error) {
      showError(error);
    }
  });
  $('#print-qr-btn').addEventListener('click', () => {
    const popup = window.open('', '_blank');
    if (!popup) {
      showError(new Error('Permita pop-ups para imprimir o QR Code.'));
      return;
    }
    const studio = escapeHTML(session.estudio.nome);
    popup.document.write(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>QR Code Anamnese</title><style>body{margin:0;background:#f0ead6;display:grid;place-items:center;min-height:100vh;font:16px Arial;text-align:center}.card{background:#fff;border:4px solid #1a1a1a;padding:3rem;box-shadow:12px 12px 0 #dc143c}h1{color:#dc143c;text-transform:uppercase}img{width:220px;height:220px}</style><body><main class="card"><h1>${studio}</h1><p>Ficha de Check-in &amp; Anamnese</p><img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=1a1a1a&margin=10" alt="QR Code"><p>Escaneie para preencher sua ficha</p></main></body></html>`);
    popup.document.close();
    popup.addEventListener('load', () => popup.print(), { once: true });
  });
}

export function initAnamnese() {
  setupPublicLink();
  $('#add-pergunta-btn').addEventListener('click', () => {
    clearQuestionForm();
    openModal('pergunta-modal');
  });
  $('#save-pergunta-btn').addEventListener('click', saveQuestion);
  $('#refresh-fichas-btn').addEventListener('click', loadForms);
  $('#close-ficha-modal').addEventListener('click', () => closeModal('ficha-detail-modal'));
  $('#close-pergunta-modal').addEventListener('click', () => closeModal('pergunta-modal'));
  $('#perguntas-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = encodeURIComponent(button.dataset.id);
    try {
      if (button.dataset.action === 'question-edit') return editQuestion(button.dataset.id);
      if (button.dataset.action === 'question-toggle') await patch(`/anamnese/perguntas/${id}/ativa`, {});
      if (button.dataset.action === 'question-delete' && window.confirm('Excluir esta pergunta? Fichas antigas preservam as respostas.')) {
        await del(`/anamnese/perguntas/${id}`);
      }
      await loadQuestions();
    } catch (error) {
      showError(error);
    }
  });
  $('#fichas-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="form-view"]');
    if (button) viewForm(button.dataset.id);
  });
}

export async function loadAnamnese() {
  await Promise.all([loadQuestions(), loadForms()]);
}
