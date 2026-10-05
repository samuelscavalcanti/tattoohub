import { del, get, patch, post, put } from '../api.js';
import { session } from '../auth.js';
import { $, closeModal, escapeHTML, money, openModal, showError, toast } from '../ui.js';

let leads = [];
let artists = [];

const columns = [
  { status: 0, id: 'kanban-col-1', badge: 'badge-col-1', title: 'Contato inicial' },
  { status: 1, id: 'kanban-col-2', badge: 'badge-col-2', title: 'Aguardando sinal' },
  { status: 2, id: 'kanban-col-3', badge: 'badge-col-3', title: 'Fechado' },
];

function render() {
  columns.forEach((column) => {
    const rows = leads.filter((lead) => lead.status === column.status);
    $(`#${column.badge}`).textContent = String(rows.length);
    $(`#${column.id}`).innerHTML = rows.length ? rows.map((lead) => `<article class="kanban-card">
      <div class="k-card-title">${escapeHTML(lead.cliente)}</div>
      <div class="k-card-desc">${escapeHTML(lead.descricao || 'Sem detalhes')}</div>
      <div class="k-card-tags"><span class="tag">${escapeHTML(lead.estilo || 'Sem estilo')}</span><span class="tag">${money(lead.preco)}</span></div>
      <small style="display:block;color:var(--text-muted);margin-top:0.6rem;">${escapeHTML(lead.artistaNome || 'Sem artista')}</small>
      <div style="display:flex;gap:0.4rem;margin-top:0.7rem;flex-wrap:wrap;">
        ${column.status !== 0 ? `<button class="icon-btn" data-action="lead-status" data-id="${escapeHTML(lead.id)}" data-status="${column.status - 1}" title="Mover para etapa anterior"><i class="ri-arrow-left-line"></i></button>` : ''}
        ${column.status !== 2 ? `<button class="icon-btn" data-action="lead-status" data-id="${escapeHTML(lead.id)}" data-status="${column.status + 1}" title="Avançar etapa"><i class="ri-arrow-right-line"></i></button>` : ''}
        <button class="icon-btn" data-action="lead-edit" data-id="${escapeHTML(lead.id)}" title="Editar"><i class="ri-pencil-line"></i></button>
        <button class="icon-btn" data-action="lead-delete" data-id="${escapeHTML(lead.id)}" title="Excluir"><i class="ri-delete-bin-line" style="color:var(--danger)"></i></button>
      </div>
    </article>`).join('') : `<p style="color:var(--text-muted);font-size:0.8rem;">Nenhum lead em ${column.title.toLowerCase()}.</p>`;
  });
}

function renderArtists(selected = '') {
  const current = session?.perfil === 'artista'
    ? [{ id: session.id, nome: session.nome }]
    : artists;
  $('#crm-in-artist').innerHTML = `<option value="">Sem artista</option>${current.map((artist) => `<option value="${escapeHTML(artist.id)}" ${artist.id === selected ? 'selected' : ''}>${escapeHTML(artist.nome)}</option>`).join('')}`;
}

export async function loadCRM() {
  try {
    [leads, artists] = await Promise.all([
      get('/leads'),
      session?.perfil === 'dono' ? get('/equipe').then((result) => result.membros) : Promise.resolve([]),
    ]);
    render();
  } catch (error) {
    showError(error);
  }
}

function clearForm() {
  ['crm-in-name', 'crm-in-tag', 'crm-in-price', 'crm-in-desc'].forEach((id) => { $(`#${id}`).value = ''; });
  $('#crm-modal-err').style.display = 'none';
  delete $('#crm-modal').dataset.editId;
}

function openNew() {
  clearForm();
  renderArtists(session?.perfil === 'artista' ? session.id : '');
  openModal('crm-modal');
}

function editLead(id) {
  const lead = leads.find((item) => item.id === id);
  if (!lead) return;
  clearForm();
  $('#crm-in-name').value = lead.cliente;
  $('#crm-in-tag').value = lead.estilo || '';
  $('#crm-in-price').value = Number(lead.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  $('#crm-in-desc').value = lead.descricao || '';
  $('#crm-modal').dataset.editId = lead.id;
  renderArtists(lead.artistaId || '');
  openModal('crm-modal');
}

function parsePrice(value) {
  const normalized = value.trim().replace(/[^\d,.-]/g, '');
  const numeric = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  return Number(numeric);
}

async function save() {
  const cliente = $('#crm-in-name').value.trim();
  if (!cliente) {
    $('#crm-modal-err').textContent = 'Informe o nome do cliente.';
    $('#crm-modal-err').style.display = 'block';
    return;
  }
  const body = {
    cliente,
    estilo: $('#crm-in-tag').value.trim(),
    preco: parsePrice($('#crm-in-price').value || '0'),
    descricao: $('#crm-in-desc').value.trim(),
    artistaId: $('#crm-in-artist').value,
  };
  const id = $('#crm-modal').dataset.editId;
  try {
    if (id) await put(`/leads/${encodeURIComponent(id)}`, body);
    else await post('/leads', body);
    closeModal('crm-modal');
    await loadCRM();
    await loadFinancialRefresh();
    toast('Lead salvo.');
  } catch (error) {
    showError(error);
  }
}

export function initCRM() {
  $('#add-lead-btn').addEventListener('click', openNew);
  $('#save-crm-btn').addEventListener('click', save);
  $('#cancel-crm-btn').addEventListener('click', () => closeModal('crm-modal'));
  document.querySelector('.kanban-board').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    try {
      if (button.dataset.action === 'lead-edit') editLead(button.dataset.id);
      if (button.dataset.action === 'lead-status') {
        await patch(`/leads/${encodeURIComponent(button.dataset.id)}/status`, { status: Number(button.dataset.status) });
        await Promise.all([loadCRM(), loadFinancialRefresh()]);
        toast('Etapa atualizada.');
      }
      if (button.dataset.action === 'lead-delete' && window.confirm('Excluir este lead?')) {
        await del(`/leads/${encodeURIComponent(button.dataset.id)}`);
        await loadCRM();
        await loadFinancialRefresh();
        toast('Lead excluído.');
      }
    } catch (error) {
      showError(error);
    }
  });
}

async function loadFinancialRefresh() {
  if (session?.perfil === 'dono') {
    const { loadFinance } = await import('./operations.js');
    await loadFinance();
    const { loadDashboard } = await import('./dashboard.js');
    await loadDashboard();
  }
}
