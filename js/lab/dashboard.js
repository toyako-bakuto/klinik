import { apiFetch } from './config.js';
import { $, $$, esc, fmtDateTime } from '../global/utils.js';
import { bukaSampel } from './sampel.js';

// ... sama persis

export async function loadDashboard() {
  try {
    const res = await apiFetch('global/stats.php');
    const stats = res.stats ?? {
      masuk: 0, sampel_diambil: 0, diproses: 0,
      menunggu_validasi: 0, selesai_hari_ini: 0
    };
    $('#stats-grid').innerHTML = `
      <div class="stat-card"><p class="stat-label">Permintaan Masuk</p><p class="stat-value">${stats.masuk}</p><p class="stat-hint">Belum diambil sampel</p></div>
      <div class="stat-card"><p class="stat-label">Sampel Diambil</p><p class="stat-value">${stats.sampel_diambil}</p><p class="stat-hint">Menunggu diproses</p></div>
      <div class="stat-card"><p class="stat-label">Diproses</p><p class="stat-value">${stats.diproses}</p><p class="stat-hint">Sedang dianalisis</p></div>
      <div class="stat-card"><p class="stat-label">Menunggu Validasi</p><p class="stat-value">${stats.menunggu_validasi}</p><p class="stat-hint">Hasil sudah diinput</p></div>
    `;

    const { data } = await apiFetch('lab/permintaan.php?status=diminta');
    const el = $('#dashboard-masuk');
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada permintaan masuk.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr>
          <th>Waktu</th><th>Pasien</th><th>Jenis Lab</th><th>Dokter</th><th></th>
        </tr></thead>
        <tbody>
          ${data.slice(0, 8).map(r => `
            <tr>
              <td class="cell-muted">${fmtDateTime(r.waktu_diminta)}</td>
              <td class="cell-name">${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
              <td>${esc(r.nama_lab)}</td>
              <td class="cell-muted">${esc(r.dokter_nama)}</td>
              <td><button class="btn btn--primary btn--sm" data-ambil="${r.id}">Ambil Sampel</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
    $$('[data-ambil]').forEach(b => b.onclick = () => bukaSampel(Number(b.dataset.ambil)));
  } catch (err) {
    $('#dashboard-masuk').innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}
