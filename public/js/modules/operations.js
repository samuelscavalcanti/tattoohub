import { del, get, patch, post, put, query } from '../api.js';
import { session } from '../auth.js';
import { $, closeModal, emptyRow, escapeHTML, money, dateBR, openModal, showError, toast } from '../ui.js';

let stockItems = [];
let currentMonth = '';

function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export async function loadStock() {
  try {
    stockItems = await get('/estoque');
    $('#estoque-list').innerHTML = stockItems.length
      ? stockItems.map((item) => `<tr>
          <td>${escapeHTML(item.item)}</td>
          <td>${escapeHTML(item.categoria)}</td>
          <td>${item.quantidade}</td>
          <td><span class="status ${item.status === 'Baixo' ? 'pending' : 'confirmed'}">${escapeHTML(item.status)}</span></td>
          <td>
            <button class="icon-btn" data-action="stock-move" data-id="${escapeHTML(item.id)}" data-type="entrada" title="Adicionar uma unidade"><i class="ri-add-line"></i></button>
            <button class="icon-btn" data-action="stock-move" data-id="${escapeHTML(item.id)}" data-type="saida" title="Retirar uma unidade"><i class="ri-subtract-line"></i></button>
            <button class="icon-btn" data-action="stock-delete" data-id="${escapeHTML(item.id)}" title="Excluir"><i class="ri-delete-bin-line" style="color:var(--danger)"></i></button>
          </td>
        </tr>`).join('')
      : emptyRow(5, 'Estoque vazio. Adicione uma nova entrada.');
  } catch (error) {
    showError(error);
  }
}

async function saveStock() {
  const item = $('#e-item').value.trim();
  const quantidade = Number($('#e-qtd').value);
  if (!item || !Number.isFinite(quantidade) || quantidade < 0) {
    showError(new Error('Informe o item e uma quantidade válida.'));
    return;
  }
  try {
    await post('/estoque', {
      item,
      categoria: $('#e-category').value.trim() || 'Geral',
      quantidade,
      estoqueMinimo: 5,
    });
    closeModal('estoque-modal');
    $('#e-item').value = '';
    $('#e-category').value = '';
    $('#e-qtd').value = '';
    await loadStock();
    toast('Estoque atualizado.');
  } catch (error) {
    showError(error);
  }
}

export async function loadFinance() {
  if (session?.perfil !== 'dono') return;
  currentMonth = $('#finance-month').value || todayISO().slice(0, 7);
  $('#finance-month').value = currentMonth;
  try {
    const monthQuery = query({ mes: currentMonth });
    const [summary, transactions, repasses] = await Promise.all([
      get(`/financeiro/resumo${monthQuery}`),
      get(`/financeiro/transacoes${monthQuery}`),
      get('/financeiro/repasses'),
    ]);
    $('#kpi-entrada').textContent = money(summary.entradas);
    $('#kpi-saida').textContent = money(summary.saidas);
    $('#kpi-lucro').textContent = money(summary.lucro);
    $('#finance-list').innerHTML = transactions.length
      ? transactions.map((transaction) => `<tr>
          <td>${escapeHTML(transaction.descricao)}</td>
          <td>${dateBR(transaction.data)}</td>
          <td><span class="status ${transaction.tipo === 'Entrada' ? 'confirmed' : 'pending'}">${escapeHTML(transaction.tipo)}</span></td>
          <td style="color:${transaction.tipo === 'Entrada' ? 'var(--success)' : 'var(--danger)'}">${transaction.tipo === 'Entrada' ? '+' : '-'} ${money(transaction.valor)}</td>
          <td>${transaction.categoria ? `<button class="icon-btn" data-action="expense-delete" data-id="${escapeHTML(transaction.id)}" title="Excluir despesa"><i class="ri-delete-bin-line" style="color:var(--danger)"></i></button>` : ''}</td>
        </tr>`).join('')
      : emptyRow(5, 'Nenhuma transação neste mês.');

    $('#split-list').innerHTML = repasses.length
      ? repasses.map((repasse) => `<div style="padding:0.8rem;background:var(--bg-base);border:1px solid var(--border-color);border-radius:6px;">
          <strong>${escapeHTML(repasse.nome)}</strong> · ${repasse.split}%<br>
          <small>Devido: ${money(repasse.devido)} · Pago: ${money(repasse.pago)} · Pendente: ${money(repasse.pendente)}</small>
          ${repasse.pendente > 0 ? `<button class="btn" data-action="pay-split" data-id="${escapeHTML(repasse.artistaId)}" style="margin-top:0.6rem;padding:0.4rem 0.7rem;font-size:0.75rem;">Pagar pendente</button>` : ''}
        </div>`).join('')
      : '<div style="text-align:center;color:var(--text-muted);padding:1.5rem;">Nenhum repasse pendente.</div>';
  } catch (error) {
    showError(error);
  }
}

async function saveExpense() {
  const descricao = $('#d-desc').value.trim();
  const valor = Number($('#d-valor').value);
  if (!descricao || !Number.isFinite(valor) || valor <= 0) {
    showError(new Error('Informe a descrição e um valor maior que zero.'));
    return;
  }
  try {
    await post('/despesas', {
      descricao,
      valor,
      categoria: $('#d-category').value,
      data: $('#d-date').value || todayISO(),
    });
    closeModal('despesa-modal');
    $('#d-desc').value = '';
    $('#d-valor').value = '';
    $('#d-date').value = '';
    await loadFinance();
    toast('Despesa registrada.');
  } catch (error) {
    showError(error);
  }
}

export async function loadTeam() {
  if (session?.perfil !== 'dono') return;
  try {
    const result = await get('/equipe');
    $('#team-plan-badge').textContent = `${result.total}/${result.limite} perfis · ${(session.estudio?.plano || '').toUpperCase()}`;
    $('#team-list').innerHTML = result.membros.map((member) => `<div style="display:flex;align-items:center;gap:0.8rem;padding:0.8rem;background:var(--bg-base);border:1px solid var(--border-color);border-radius:6px;flex-wrap:wrap;">
      <div style="flex:1;min-width:160px;"><strong>${escapeHTML(member.nome)}</strong><br><small>${escapeHTML(member.funcao)} · ${escapeHTML(member.email)}</small></div>
      <label>Split <input type="number" min="0" max="100" value="${member.split}" data-split-id="${escapeHTML(member.id)}" style="width:72px;"></label>
      ${member.perfil !== 'dono' ? `<button class="icon-btn" data-action="team-save" data-id="${escapeHTML(member.id)}" title="Salvar split"><i class="ri-save-line"></i></button><button class="icon-btn" data-action="team-delete" data-id="${escapeHTML(member.id)}" title="Remover artista"><i class="ri-delete-bin-line" style="color:var(--danger)"></i></button>` : ''}
    </div>`).join('');
  } catch (error) {
    showError(error);
  }
}

async function createArtist() {
  const body = {
    nome: $('#art-name').value.trim(),
    funcao: $('#art-role').value.trim() || 'Tatuador',
    split: Number($('#art-split').value),
    email: $('#art-email').value.trim(),
    senha: $('#art-pass').value,
  };
  try {
    await post('/equipe', body);
    closeModal('artist-modal');
    ['art-name', 'art-role', 'art-split', 'art-email', 'art-pass'].forEach((id) => { $(`#${id}`).value = ''; });
    await Promise.all([loadTeam(), loadFinance()]);
    toast('Artista adicionado à equipe.');
  } catch (error) {
    showError(error);
  }
}

export async function downloadStatement() {
  try {
    const month = $('#finance-month').value || todayISO().slice(0, 7);
    const response = await get(`/financeiro/extrato.csv${query({ mes: month })}`);
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'extrato.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showError(error);
  }
}

export function initOperations() {
  $('#add-estoque-btn').addEventListener('click', () => {
    $('#e-item').value = '';
    $('#e-category').value = '';
    $('#e-qtd').value = '';
    openModal('estoque-modal');
  });
  $('#save-stock-btn').addEventListener('click', saveStock);
  $('#cancel-stock-btn').addEventListener('click', () => closeModal('estoque-modal'));
  $('#estoque-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    try {
      if (button.dataset.action === 'stock-move') {
        await patch(`/estoque/${encodeURIComponent(button.dataset.id)}/movimentar`, { tipo: button.dataset.type, quantidade: 1 });
      } else if (button.dataset.action === 'stock-delete' && window.confirm('Excluir este item do estoque?')) {
        await del(`/estoque/${encodeURIComponent(button.dataset.id)}`);
      } else {
        return;
      }
      await loadStock();
    } catch (error) {
      showError(error);
    }
  });

  $('#add-despesa-btn').addEventListener('click', () => {
    $('#d-desc').value = '';
    $('#d-valor').value = '';
    $('#d-date').value = todayISO();
    $('#d-category').value = 'Outros';
    openModal('despesa-modal');
  });
  $('#save-expense-btn').addEventListener('click', saveExpense);
  $('#cancel-expense-btn').addEventListener('click', () => closeModal('despesa-modal'));
  $('#finance-month').addEventListener('change', loadFinance);
  $('#export-statement-btn').addEventListener('click', downloadStatement);
  $('#finance-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="expense-delete"]');
    if (!button || !window.confirm('Excluir esta despesa?')) return;
    try {
      await del(`/despesas/${encodeURIComponent(button.dataset.id)}`);
      await loadFinance();
      toast('Despesa excluída.');
    } catch (error) {
      showError(error);
    }
  });
  $('#split-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="pay-split"]');
    if (!button || !window.confirm('Registrar o pagamento do repasse pendente?')) return;
    try {
      await post(`/financeiro/repasses/${encodeURIComponent(button.dataset.id)}/pagar`, {});
      await loadFinance();
      toast('Repasse registrado.');
    } catch (error) {
      showError(error);
    }
  });

  $('#add-artist-btn').addEventListener('click', () => openModal('artist-modal'));
  $('#save-artist-btn').addEventListener('click', createArtist);
  $('#cancel-artist-btn').addEventListener('click', () => closeModal('artist-modal'));
  $('#team-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    try {
      if (button.dataset.action === 'team-save') {
        const input = document.querySelector(`[data-split-id="${CSS.escape(button.dataset.id)}"]`);
        await put(`/equipe/${encodeURIComponent(button.dataset.id)}`, { split: Number(input.value) });
        await Promise.all([loadTeam(), loadFinance()]);
        toast('Split atualizado.');
      }
      if (button.dataset.action === 'team-delete' && window.confirm('Remover este artista? O histórico será preservado.')) {
        await del(`/equipe/${encodeURIComponent(button.dataset.id)}`);
        await Promise.all([loadTeam(), loadFinance()]);
        toast('Artista removido.');
      }
    } catch (error) {
      showError(error);
    }
  });
}

export async function loadAdminData() {
  if (session?.perfil !== 'dono') return;
  await Promise.all([loadFinance(), loadTeam()]);
}
