import { del, get, put } from '../api.js';
import { session } from '../auth.js';
import { $, showError, toast } from '../ui.js';

export async function loadSettings() {
  if (session?.perfil !== 'dono') return;
  try {
    const result = await get('/config');
    $('#studio-name').value = result.estudio.nome || '';
    $('#studio-instagram').value = result.estudio.instagram || '';
    $('#studio-message').value = result.estudio.mensagemOrcamento || '';
    if (result.usuario.avatar) {
      $('#settings-avatar-preview').src = result.usuario.avatar;
      document.querySelectorAll('.header-avatar-img').forEach((image) => { image.src = result.usuario.avatar; });
    }
  } catch (error) {
    showError(error);
  }
}

export function initSettings() {
  $('#choose-avatar-btn').addEventListener('click', () => $('#avatar-upload').click());
  $('#avatar-upload').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      showError(new Error('Escolha uma imagem de até 2MB.'));
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showError(new Error('Não foi possível ler a imagem.'));
    reader.onload = async () => {
      try {
        const result = await put('/config/perfil', { avatar: reader.result });
        $('#settings-avatar-preview').src = result.usuario.avatar;
        document.querySelectorAll('.header-avatar-img').forEach((image) => { image.src = result.usuario.avatar; });
        toast('Foto de perfil atualizada.');
      } catch (error) {
        showError(error);
      }
    };
    reader.readAsDataURL(file);
  });

  $('#save-studio-btn').addEventListener('click', async () => {
    try {
      await put('/config/estudio', {
        nome: $('#studio-name').value.trim(),
        instagram: $('#studio-instagram').value.trim(),
        mensagemOrcamento: $('#studio-message').value,
      });
      toast('Dados do estúdio atualizados.');
    } catch (error) {
      showError(error);
    }
  });

  $('#delete-account-btn').addEventListener('click', async () => {
    if (!window.confirm('Esta ação apagará permanentemente o estúdio e todos os dados. Continuar?')) return;
    const senha = window.prompt('Confirme sua senha para excluir a conta:');
    if (senha === null) return;
    try {
      await del('/config/conta', { senha });
      window.location.reload();
    } catch (error) {
      showError(error);
    }
  });
}
