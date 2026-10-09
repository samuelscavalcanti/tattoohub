const installButton = document.querySelector('#pwa-install');
let installPrompt;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .catch((error) => console.error('Não foi possível ativar o suporte PWA:', error));
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!installPrompt) return;

  try {
    await installPrompt.prompt();
    await installPrompt.userChoice;
  } catch (error) {
    console.error('Não foi possível iniciar a instalação do aplicativo:', error);
  } finally {
    installPrompt = null;
    installButton.hidden = true;
  }
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
});
