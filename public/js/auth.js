import { ApiError, get, post } from './api.js';
import { $, showError } from './ui.js';

export let session = null;

function renderUser() {
  const user = session;
  const studio = session?.estudio;
  if (!user) return;

  const displayName = user.nome || studio?.nome || 'TattooHub';
  $('#header-dropdown-user').textContent = `${displayName} · ${user.email}`;
  $$('.header-avatar-img, #settings-avatar-preview').forEach((image) => {
    if (user.avatar) image.src = user.avatar;
  });

  const isOwner = user.perfil === 'dono';
  const questionButton = document.getElementById('add-pergunta-btn');
  if (questionButton) questionButton.hidden = !isOwner;
  ['financeiro', 'config'].forEach((target) => {
    const link = document.querySelector(`.nav-item[data-target="${target}"]`);
    if (link) link.hidden = !isOwner;
  });
  const financeView = $('#financeiro');
  if (financeView) financeView.hidden = !isOwner;
  const dashboardLink = document.querySelector('.nav-item[data-target="dashboard"]');
  if (dashboardLink) dashboardLink.hidden = !isOwner;

}

function $$(selector) {
  return [...document.querySelectorAll(selector)];
}

export function showApplication() {
  document.body.classList.remove('unauthenticated');
  document.body.classList.add('authenticated');
  $('#loading-screen')?.remove();
  renderUser();
}

export async function login(email, senha) {
  const result = await post('/auth/login', { email, senha });
  session = result.usuario;
  showApplication();
  return session;
}
export async function register({ nome, nomeEstudio, email, senha }) {
  const result = await post('/auth/register', { nome, nomeEstudio, email, senha });
  session = result.usuario;
  showApplication();
  return session;
}

export async function logout() {
  await post('/auth/logout', {});
  session = null;
  window.location.reload();
}

export async function restoreSession() {
  try {
    const result = await get('/auth/me');
    session = result.usuario;
    showApplication();
    return session;
  } catch (error) {
    $('#loading-screen')?.remove();
    if (error instanceof ApiError && error.status === 401) return null;
    showError(error);
    return null;
  }
}
