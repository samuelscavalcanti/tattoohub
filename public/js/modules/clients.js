import { del, get, post, put, query } from '../api.js';
import { $, closeModal, emptyRow, escapeHTML, money, dateBR, openModal, showError, toast } from '../ui.js';

let clients = [];
let searchTimer;

function render() {
  $('#clients-list').innerHTML = clients.length
    ? clients.map((client) => `<tr>
        <td>${escapeHTML(client.nome)}<br><small>${escapeHTML(client.telefone || client.email || '')}</small></td>
        <td>${dateBR(client.ultimaSessao)}</td>
        <td>${money(client.totalGasto)}</td>
        <td>${escapeHTML(client.anamnese || 'Pendente')}</td>
        <td>
          <button class="icon-btn" data-action="client-edit" data-id="${escapeHTML(client.id)}" title="Editar"><i class="ri-pencil-line"></i></button>
          <button class="icon-btn" data-action="client-delete" data-id="${escapeHTML(client.id)}" title="Excluir"><i class="ri-delete-bin-line" style="color:var(--danger)"></i></button>
        </td>
      </tr>`).join('')
    : emptyRow(5, 'Nenhum cliente cadastrado.');
}

export async function loadClients(search = '') {
  try {
    const result = await get(`/clientes${query({ busca: search, limit: 100 })}`);
    clients = result.dados;
    render();
  } catch (error) {
    showError(error);
  }
}

function resetForm() {
  $('#c-edit-id').value = '';
  $('#c-modal-title').textContent = 'Novo Cliente';
  ['c-name', 'c-phone', 'c-birth', 'c-style', 'c-spent'].forEach((id) => { $(`#${id}`).value = ''; });
}

function openNew() {
  resetForm();
  openModal('client-modal');
}

function edit(id) {
  const client = clients.find((item) => item.id === id);
  if (!client) return;
  $('#c-edit-id').value = client.id;
  $('#c-modal-title').textContent = 'Editar Cliente';
  $('#c-name').value = client.nome;
  $('#c-phone').value = client.telefone || '';
  $('#c-birth').value = client.nascimento ? String(client.nascimento).slice(0, 10) : '';
  $('#c-style').value = client.estilo || '';
  $('#c-spent').value = client.totalGasto || 0;
  openModal('client-modal');
}

async function save() {
  const id = $('#c-edit-id').value;
  const body = {
    nome: $('#c-name').value.trim(),
    telefone: $('#c-phone').value.trim(),
    nascimento: $('#c-birth').value || undefined,
    estilo: $('#c-style').value.trim(),
    totalGasto: Number($('#c-spent').value || 0),
  };
  try {
    if (id) await put(`/clientes/${encodeURIComponent(id)}`, body);
    else await post('/clientes', body);
    closeModal('client-modal');
    await loadClients($('#client-search').value);
    toast('Cliente salvo.');
  } catch (error) {
    showError(error);
  }
}

async function remove(id) {
  if (!window.confirm('Excluir este cliente? Agendamentos anteriores manterão o nome.')) return;
  try {
    await del(`/clientes/${encodeURIComponent(id)}`);
    await loadClients($('#client-search').value);
    toast('Cliente excluído.');
  } catch (error) {
    showError(error);
  }
}

export function initClients() {
  $('#add-client-btn').addEventListener('click', openNew);
  $('#save-client-btn').addEventListener('click', save);
  $('#cancel-client-btn').addEventListener('click', () => { closeModal('client-modal'); resetForm(); });
  $('#client-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadClients($('#client-search').value.trim()), 250);
  });
  $('#clients-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'client-edit') edit(button.dataset.id);
    if (button.dataset.action === 'client-delete') remove(button.dataset.id);
  });
}
