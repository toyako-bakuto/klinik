/* =========================================================
   GENERIC AUTH GUARD
   ========================================================= */
import { $ } from './utils.js';
import { makeApi } from './api.js';

export async function initAuth({ apiBase, onReady, state }) {
  const apiFetch = makeApi(apiBase);
  try {
    const data = await apiFetch('global/cek-session.php');
    if (state) state.user = data.user;

    $('#user-nama').textContent   = data.user.nama;
    $('#user-role').textContent   = data.user.role;
    $('#user-avatar').textContent = (data.user.nama || '?').charAt(0).toUpperCase();

    document.body.classList.remove('auth-pending');

    const now = new Date();
    $('#today-date').textContent = now.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    if (typeof onReady === 'function') {
      await onReady(data.user);
    }
  } catch (err) {
    console.error('Gagal verifikasi session:', err);
    window.location.href = '../index.html';
  }
}
