import { state, apiFetch, badge } from './config.js';
import { $, $$, esc, age } from '../global/utils.js';
import { showPemeriksaan } from './pemeriksaan.js';

// ... sama persis

export async function loadAntrean() {
  const tglInput = $('#antrean-tanggal');
  if (!tglInput.value) tglInput.value = new Date().toISOString().slice(0, 10);
  const el = $('#antrean-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const { data } = await apiFetch('global/antrean.php?tanggal=' + encodeURIComponent(tglInput.value));
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada pasien pada antrean ini.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Antrean</th><th>Pasien</th><th>JK / Umur</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${data.map(r => `
              <tr>
                <td class="cell-name">${esc(r.no_antrean || '—')}</td>
                <td>${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
                <td class="cell-muted">${r.jenis_kelamin === 'L' ? 'L' : 'P'} · ${age(r.tanggal_lahir)}</td>
                <td>${badge(r.status_pendaftaran)}</td>
                <td>
                  <button class="btn ${r.status_pendaftaran === 'menunggu_dokter' ? 'btn--primary' : 'btn--ghost'} btn--sm"
                          data-panggil="${r.pendaftaran_id}">
                    ${r.status_pendaftaran === 'menunggu_dokter' ? 'Panggil' :
                      r.status_pendaftaran === 'menunggu_lab' ? 'Lihat Hasil Lab' : 'Lanjutkan'}
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    $$('[data-panggil]').forEach(b => b.onclick = () =>
      panggilPasien(Number(b.dataset.panggil)));
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export async function panggilPasien(pendaftaranId) {
  const btn = document.querySelector('.sidebar [data-target="pemeriksaan"]');
  if (btn) btn.click();

  const container = $('#pemeriksaan-container');
  container.innerHTML = '<div class="loading">Membuka rekam medis…</div>';

  try {
    // Buat RM draft (kalau belum) — status pendaftaran jadi diperiksa
    await apiFetch('dokter/rekam-medis.php', {
      method: 'POST',
      body: JSON.stringify({ pendaftaran_id: pendaftaranId })
    });
    const data = await apiFetch('dokter/rekam-medis.php?pendaftaran_id=' + pendaftaranId);
    state.currentRM = data;
    showPemeriksaan();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initAntreanEvents() {
  $('#antrean-tanggal').addEventListener('change', loadAntrean);
  $('#btn-refresh-antrean').addEventListener('click', loadAntrean);
}
