import { state, apiFetch, badge } from './config.js';
import { $, $$, esc, age } from '../global/utils.js';
import { showPemeriksaan } from './pemeriksaan.js';

// ... sisa file sama persis dengan versi sebelum migrasi

export async function loadAntrean() {
  const tglInput = $('#antrean-tanggal');

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  if (!tglInput.value) {
    tglInput.value = today;
  }

  const el = $('#antrean-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';

  try {
    const { data } = await apiFetch('global/antrean.php?tanggal=' + encodeURIComponent(tglInput.value));
    state.antrean = data;
    if (data.length === 0) {
        const message = tglInput.value === today
            ? 'Belum ada pendaftaran hari ini.'
            : 'Belum ada pendaftaran pada tanggal ini.';

        el.innerHTML = `<div class="empty-state">${message}</div>`;
        return;
    }
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>No. Antrean</th><th>Pasien</th><th>JK / Umur</th><th>Dokter</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${data.map(r => `
              <tr>
                <td class="cell-name">${esc(r.no_antrean || '—')}</td>
                <td>${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
                <td class="cell-muted">${r.jenis_kelamin === 'L' ? 'L' : 'P'} · ${age(r.tanggal_lahir)}</td>
                <td>${esc(r.dokter_nama)} <span class="cell-muted">· ${esc(r.spesialis)}</span></td>
                <td>${badge(r.pa_status === 'draft' ? 'draft' : r.status_pendaftaran)}</td>
                <td>
                  <button class="btn ${r.pa_status === 'draft' ? 'btn--primary' : 'btn--ghost'} btn--sm"
                          data-mulai="${r.pendaftaran_id}">
                    ${r.pa_status === 'draft' ? 'Lanjutkan' : 'Periksa'}
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    $$('[data-mulai]').forEach(b => b.onclick = () =>
      mulaiPemeriksaan(Number(b.dataset.mulai)));
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

/**
 * Buka section pemeriksaan lalu inisiasi pemeriksaan awal untuk pendaftaran tertentu.
 * Fungsi ini menjadi jembatan dari dashboard/antrean → pemeriksaan.
 */
export async function mulaiPemeriksaan(pendaftaranId) {
  // Pindah ke section pemeriksaan
  const btn = document.querySelector('.sidebar [data-target="pemeriksaan"]');
  if (btn) btn.click();

  const container = $('#pemeriksaan-container');
  container.innerHTML = '<div class="loading">Memuat data pasien…</div>';

  try {
    // 1. Ambil detail pemeriksaan terlebih dahulu
    const data = await apiFetch(
      'perawat/pemeriksaan.php?pendaftaran_id=' + pendaftaranId
    );

    // 2. Jika pemeriksaan belum ada, buat pemeriksaan baru
    if (!data.pemeriksaan) {
      await apiFetch('perawat/pemeriksaan.php', {
        method: 'POST',
        body: JSON.stringify({
          pendaftaran_id: pendaftaranId
        })
      });

      // 3. Ambil ulang detail setelah pemeriksaan dibuat
      const hasil = await apiFetch(
        'perawat/pemeriksaan.php?pendaftaran_id=' + pendaftaranId
      );

      state.currentPA = hasil;
    } else {
      // Pemeriksaan sudah ada, langsung gunakan datanya
      state.currentPA = data;
    }

    // 4. Tampilkan pemeriksaan
    showPemeriksaan();

  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">${esc(err.message)}</div>
    `;
  }
}

export function initAntreanEvents() {
  $('#antrean-tanggal').addEventListener('change', loadAntrean);
  $('#btn-refresh-antrean').addEventListener('click', loadAntrean);
}
