import { state, apiFetch } from './config.js';

export async function loadMasterObat() {
  try {
    const { data } = await apiFetch('dokter/master.php?type=obat');
    state.masterObat = data;
  } catch {}
}

export async function loadMasterLab() {
  try {
    const { data } = await apiFetch('dokter/master.php?type=lab');
    state.masterLab = data;
  } catch {}
}

export async function loadAllMaster() {
  await Promise.all([loadMasterObat(), loadMasterLab()]);
}
