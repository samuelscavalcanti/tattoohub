import { del, get, patch, post, query } from '../api.js';
import { $, closeModal, escapeHTML, openModal, showError, toast } from '../ui.js';

let appointments = [];

function toISO(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function weekBounds() {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return { monday, sunday };
}

function render() {
  const { monday } = weekBounds();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    return date;
  });
  $('#agenda-calendar-grid').innerHTML = days.map((date) => {
    const iso = toISO(date);
    const items = appointments.filter((appointment) => appointment.data === iso);
    return `<div class="panel" style="padding:0.8rem;min-width:0;">
      <strong>${date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong>
      <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.8rem;">
        ${items.length ? items.map((item) => `<div style="padding:0.6rem;background:var(--bg-base);border:1px solid var(--border-color);">
          <strong>${escapeHTML(item.hora || 'Sem horário')}</strong> · ${escapeHTML(item.clienteNome)}
          <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHTML(item.servico)} · ${escapeHTML(item.profissionalNome || '')}</div>
          <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-top:0.45rem;">
            <select aria-label="Status do agendamento" data-action="appointment-status" data-id="${escapeHTML(item.id)}">
              ${['agendado', 'confirmado', 'concluido', 'cancelado'].map((status) => `<option value="${status}" ${status === item.status ? 'selected' : ''}>${status}</option>`).join('')}
            </select>
            <button class="icon-btn" data-action="appointment-delete" data-id="${escapeHTML(item.id)}" title="Excluir"><i class="ri-delete-bin-line"></i></button>
          </div>
        </div>`).join('') : '<span style="font-size:0.8rem;color:var(--text-muted);">Sem agendamentos</span>'}
      </div>
    </div>`;
  }).join('');
}

export async function loadAgenda() {
  const { monday, sunday } = weekBounds();
  try {
    appointments = await get(`/agendamentos${query({ de: toISO(monday), ate: toISO(sunday) })}`);
    render();
  } catch (error) {
    showError(error);
  }
}

async function save() {
  const body = {
    clienteNome: $('#a-client').value.trim(),
    data: $('#a-date').value,
    hora: $('#a-time').value,
    servico: $('#a-service').value.trim(),
  };
  try {
    await post('/agendamentos', body);
    closeModal('agenda-modal');
    $('#a-client').value = '';
    $('#a-date').value = '';
    $('#a-time').value = '';
    $('#a-service').value = '';
    await loadAgenda();
    toast('Agendamento criado.');
  } catch (error) {
    showError(error);
  }
}

export function initAgenda() {
  $('#add-agenda-btn').addEventListener('click', () => openModal('agenda-modal'));
  $('#save-agenda-btn').addEventListener('click', save);
  $('#cancel-agenda-btn').addEventListener('click', () => closeModal('agenda-modal'));
  $('#agenda-calendar-grid').addEventListener('change', async (event) => {
    const select = event.target.closest('[data-action="appointment-status"]');
    if (!select) return;
    try {
      await patch(`/agendamentos/${encodeURIComponent(select.dataset.id)}/status`, { status: select.value });
      await loadAgenda();
      toast('Status atualizado.');
    } catch (error) {
      showError(error);
      await loadAgenda();
    }
  });
  $('#agenda-calendar-grid').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="appointment-delete"]');
    if (!button || !window.confirm('Excluir este agendamento?')) return;
    try {
      await del(`/agendamentos/${encodeURIComponent(button.dataset.id)}`);
      await loadAgenda();
      toast('Agendamento excluído.');
    } catch (error) {
      showError(error);
    }
  });
}
