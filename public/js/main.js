import { ApiError } from './api.js';
import { login, logout, restoreSession, session } from './auth.js';
import { initAgenda, loadAgenda } from './modules/agenda.js';
import { initAnamnese, loadAnamnese } from './modules/anamnese.js';
import { initClients, loadClients } from './modules/clients.js';
import { initCRM, loadCRM } from './modules/crm.js';
import { loadDashboard } from './modules/dashboard.js';
import { downloadStatement, initOperations, loadAdminData, loadStock, loadTeam } from './modules/operations.js';
import { initSettings, loadSettings } from './modules/settings.js';
import { $, showError, toast } from './ui.js';

const views = {
  dashboard: loadDashboard,
  crm: loadCRM,
  clients: () => loadClients($('#client-search').value),
  agenda: loadAgenda,
  anamnese: loadAnamnese,
  estoque: loadStock,
  financeiro: loadAdminData,
  config: () => Promise.all([loadSettings(), loadTeam()]),
};

function selectView(target) {
  if (session?.perfil !== 'dono' && ['dashboard', 'financeiro', 'config'].includes(target)) return;
  document.querySelectorAll('.view-section').forEach((view) => {
    view.classList.toggle('active', view.id === target);
  });
  document.querySelectorAll('.nav-item[data-target]').forEach((item) => {
    item.classList.toggle('active', item.dataset.target === target);
  });
  views[target]?.();
}

function setTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  $('#theme-toggle').checked = isDark;
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  const icon = $('#headerThemeToggle i');
  icon.classList.toggle('ri-moon-line', !isDark);
  icon.classList.toggle('ri-sun-line', isDark);
}

function initializeModules() {
  initAgenda();
  initAnamnese();
  initClients();
  initCRM();
  initOperations();
  initSettings();
  document.querySelectorAll('.nav-item[data-target]').forEach((item) => {
    item.addEventListener('click', () => selectView(item.dataset.target));
  });
  $('#logout-btn').addEventListener('click', async () => {
    try {
      await logout();
    } catch (error) {
      showError(error);
    }
  });
  $('#header-avatar-btn').addEventListener('click', () => {
    const dropdown = $('#header-dropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });
  $('#login-submit').addEventListener('click', submitLogin);
  ['sl-email', 'sl-pass'].forEach((id) => {
    $(`#${id}`).addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submitLogin();
    });
  });
  $('#headerThemeToggle').addEventListener('click', () => setTheme($('#theme-toggle').checked === false));
  $('#theme-toggle').addEventListener('change', (event) => setTheme(event.target.checked));
  $('.search-bar input').addEventListener('input', (event) => {
    $('#client-search').value = event.target.value;
    const clientNav = document.querySelector('.nav-item[data-target="clients"]');
    if (session && !$('#clients').classList.contains('active')) clientNav.click();
    $('#client-search').dispatchEvent(new Event('input'));
  });
  $('#export-report-btn').addEventListener('click', () => {
    if (session?.perfil === 'dono') downloadStatement();
  });
  document.addEventListener('click', (event) => {
    const modal = event.target.closest('[id$="-modal"]');
    if (event.target === modal) modal.style.display = 'none';
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.querySelectorAll('[id$="-modal"]').forEach((modal) => { modal.style.display = 'none'; });
  });
}

async function submitLogin() {
  const button = $('#login-submit');
  const errorBox = $('#sl-err');
  errorBox.style.display = 'none';
  button.disabled = true;
  button.textContent = 'VERIFICANDO...';
  try {
    await login($('#sl-email').value.trim(), $('#sl-pass').value);
    $('#sl-pass').value = '';
    await afterLogin();
  } catch (error) {
    errorBox.textContent = error instanceof ApiError ? error.message : 'Não foi possível conectar à API.';
    errorBox.style.display = 'block';
  } finally {
    button.disabled = false;
    button.textContent = 'ACESSAR O SISTEMA →';
  }
}

async function afterLogin() {
  setTheme(localStorage.getItem('theme') === 'dark');
  selectView(session.perfil === 'dono' ? 'dashboard' : 'agenda');
}

async function start() {
  initializeModules();
  setTheme(localStorage.getItem('theme') === 'dark');
  const user = await restoreSession();
  if (user) await afterLogin();
}

start().catch(showError);
