import { apiFetch } from './config.js';
import { $, $$, esc, fmtDate } from '../global/utils.js';
import { bukaResep } from './resep.js';

// ... sama persis

export async function loadDashboard() {
  try {
    const { stats } = await apiFetch('global/stats.php');
    $('#stats-grid').innerHTML = `
      <div class="stat-card"><p class="stat-label">Resep Masuk</p><p class="stat-value">${stats.masuk}</p><p class="stat-hint">Belum diverifikasi</p></div>
      <div class="stat-card"><p class="stat-label">Diverifikasi</p><p class="stat-value">${stats.diverifikasi}</p><p class="stat-hint">Siap disiapkan</p></div>
      <div class="stat-card"><p class="stat-label">Disiapkan</p><p class="stat-value">${stats.disiapkan}</p><p class="stat-hint">Menunggu diserahkan</p></div>
      <div class="stat-card"><p class="stat-label">Selesai Hari Ini</p><p class="stat-value">${stats.selesai_hari_ini}</p><p class="stat-hint">Sudah diserahkan</p></div>
    `;

    const { data } = await apiFetch('global/resep.php?status=masuk');
    const el = $('#dashboard-resep');
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada resep masuk.</div>';
      return;
    }
    el.innerHTML = `
      <h2 style="margin-bottom:var(--space-4);font-size:var(--text-lg);font-weight:700;">Resep Terbaru Masuk</h2>
      <div class="table-wrapper"><table>
        <thead><tr><th>Tanggal</th><th>Pasien</th><th>Dokter</th><th>Jml Obat</th><th></th></tr></thead>
        <tbody>
          ${data.slice(0, 8).map(r => `
            <tr>
              <td class="cell-muted">${fmtDate(r.tanggal)}</td>
              <td class="cell-name">${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
              <td>${esc(r.dokter_nama)}</td>
              <td>${r.jml_item} obat</td>
              <td><button class="btn btn--primary btn--sm" data-buka="${r.id}">Buka</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
    $$('[data-buka]').forEach(b => b.onclick = () => bukaResep(Number(b.dataset.buka), 'verifikasi'));
  } catch (err) {
    $('#dashboard-resep').innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}
