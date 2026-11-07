import { apiFetch, state } from './config.js';

export async function loadDokter() {
  try {
    const { data } = await apiFetch('admin/dokter.php');
    state.dokter = data;
  } catch {}
}
