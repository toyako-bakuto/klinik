import { $, $$, esc } from '../global/utils.js';
import { apiFetch } from './config.js';
import { mulaiPemeriksaan } from './antrean.js';

export async function loadDashboard() {
  try {
    const { stats } = await apiFetch('global/stats.php');
    $('#stats-grid').innerHTML = `
      <div class="stat-card"><p class="stat-label">Menunggu</p><p class="stat-value">${stats.menunggu}</p><p class="stat-hint">Belum diperiksa</p></div>
      <div class="stat-card"><p class="stat-label">Sedang Diisi</p><p class="stat-value">${stats.draft}</p><p class="stat-hint">Pemeriksaan draft</p></div>
      <div class="stat-card"><p class="stat-label">Selesai</p><p class="stat-value">${stats.selesai}</p><p class="stat-hint">Sudah diteruskan</p></div>
      <div class="stat-card"><p class="stat-label">Total Hari Ini</p><p class="stat-value">${stats.total_hari_ini}</p><p class="stat-hint">Semua pendaftaran</p></div>
    `;

    const { data } = await apiFetch('global/antrean.php');
    const menunggu = data.filter(r => r.pa_status !== 'draft');
    const el = $('#dashboard-antrean');
    if (menunggu.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada pasien menunggu pemeriksaan awal.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>No. Antrean</th><th>Pasien</th><th>Dokter</th><th>Keluhan</th><th></th>
          </tr></thead>
          <tbody>
            ${menunggu.slice(0, 8).map(r => `
              <tr>
                <td class="cell-name">${esc(r.no_antrean || '—')}</td>
                <td>${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
                <td>${esc(r.dokter_nama)} <span class="cell-muted">· ${esc(r.spesialis)}</span></td>
                <td class="cell-muted">${esc(r.keluhan_daftar || '—')}</td>
                <td><button class="btn btn--primary btn--sm" data-mulai="${r.pendaftaran_id}">Periksa</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    $$('[data-mulai]').forEach(b => b.onclick = () =>
      mulaiPemeriksaan(Number(b.dataset.mulai)));
  } catch (err) {
    $('#dashboard-antrean').innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}
