import { state, apiFetch } from './config.js';
import { $ } from '../global/utils.js';
import { showPemeriksaan } from './pemeriksaan.js';
import { emit } from '../global/events.js';

// ... sama persis, tapi emit('dokter:rm-finalized') — bukan 'rm:finalized'

export function collectRMFields() {
  return {
    keluhan:            $('#f-keluhan')?.value.trim() || '',
    anamnesis:          $('#f-anamnesis')?.value.trim() || '',
    pemeriksaan_fisik:  $('#f-fisik')?.value.trim() || '',
    catatan:            $('#f-catatan')?.value.trim() || '',
    diagnosis_utama:    $('#f-dx-utama')?.value.trim() || '',
    diagnosis_kode:     $('#f-dx-kode')?.value.trim() || '',
    diagnosis_sekunder: $('#f-dx-sekunder')?.value.trim() || '',
  };
}

/* =========================================================
   BARU: Simpan field RM tanpa validasi & tanpa finalize.
   Dipanggil sebelum reloadRM() supaya input tidak hilang
   saat user menambah tindakan/resep/lab.
   ========================================================= */
export async function saveRMFieldsSilently() {
  const rm = state.currentRM?.rekam_medis;
  if (!rm) return;
  const fields = collectRMFields();
  // skip kalau semua kosong (tidak perlu hit server)
  const hasContent = Object.values(fields).some(v => v !== '');
  if (!hasContent) return;

  try {
    await apiFetch('dokter/rekam-medis.php', {
      method: 'PUT',
      body: JSON.stringify({ id: rm.id, ...fields })
    });
  } catch (err) {
    // jangan ganggu UX; log saja
    console.warn('Auto-save RM fields gagal:', err.message);
  }
}

export async function reloadRM() {
  const data = await apiFetch('dokter/rekam-medis.php?pendaftaran_id=' + state.currentRM.pendaftaran.id);
  state.currentRM = data;
  showPemeriksaan();
}

export async function simpanRM(finalize) {
  const rm = state.currentRM.rekam_medis;
  if (!rm) return;

  const btn = finalize === 'selesai'   ? $('#btn-selesai')
            : finalize === 'minta_lab' ? $('#btn-minta-lab')
            :                            $('#btn-simpan');
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = 'Menyimpan…';

  try {
    const payload = { id: rm.id, ...collectRMFields() };

    if (finalize === 'selesai') {
      if (!payload.diagnosis_utama) {
        alert('Diagnosis utama wajib diisi sebelum menyelesaikan.');
        btn.disabled = false; btn.textContent = old;
        return;
      }
      payload.action = 'selesai';
      await apiFetch('dokter/rekam-medis.php', { method: 'PUT', body: JSON.stringify(payload) });
      alert('Pemeriksaan selesai.');
      emit('dokter:rm-finalized');
      const b = document.querySelector('.sidebar [data-target="antrean"]');
      if (b) b.click();
      return;
    }

    await apiFetch('dokter/rekam-medis.php', { method: 'PUT', body: JSON.stringify(payload) });

    if (finalize === 'minta_lab') {
      await apiFetch('dokter/rekam-medis.php', {
        method: 'PUT',
        body: JSON.stringify({ id: rm.id, action: 'minta_lab' })
      });
      alert('Pasien ditandai menunggu hasil lab.');
      emit('dokter:rm-finalized');
      const b = document.querySelector('.sidebar [data-target="antrean"]');
      if (b) b.click();
      return;
    }

    await reloadRM();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false; btn.textContent = old;
  }
}
