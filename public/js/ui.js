export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dateBR(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
}

export function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

export function toast(message, isError = false) {
  let element = document.getElementById('app-toast');
  if (!element) {
    element = document.createElement('div');
    element.id = 'app-toast';
    element.setAttribute('role', 'status');
    element.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:100000;padding:12px 18px;border:2px solid var(--border-color);background:var(--bg-surface);color:var(--text-main);box-shadow:4px 4px 0 var(--border-color);max-width:min(90vw,420px);';
    document.body.append(element);
  }
  element.style.borderColor = isError ? 'var(--danger)' : 'var(--success)';
  element.textContent = message;
  element.hidden = false;
  clearTimeout(element.hideTimer);
  element.hideTimer = setTimeout(() => { element.hidden = true; }, 3500);
}

export function showError(error) {
  toast(error instanceof Error ? error.message : String(error), true);
}

export function emptyRow(columns, message) {
  return `<tr><td colspan="${columns}" style="text-align:center;color:var(--text-muted);padding:1.5rem;">${escapeHTML(message)}</td></tr>`;
}
