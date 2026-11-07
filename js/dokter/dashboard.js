import { apiFetch, badge } from './config.js';
import { $, $$, esc, age } from '../global/utils.js';
import { panggilPasien } from './antrean.js';

// ... sama persis

export async function loadDashboard() {
  try {
    const { stats } = await apiFetch('global/stats.php');
    $('#stats-grid').innerHTML = `
      <div class="stat-card"><p class="stat-label">Menunggu</p><p class="stat-value">${stats.menunggu_dokter}</p><p class="stat-hint">Belum dipanggil</p></div>
      <div class="stat-card"><p class="stat-label">Diperiksa</p><p class="stat-value">${stats.diperiksa}</p><p class="stat-hint">Sedang ditangani</p></div>
      <div class="stat-card"><p class="stat-label">Menunggu Lab</p><p class="stat-value">${stats.menunggu_lab}</p><p class="stat-hint">Menunggu hasil</p></div>
      <div class="stat-card"><p class="stat-label">Selesai</p><p class="stat-value">${stats.selesai}</p><p class="stat-hint">Hari ini</p></div>
    `;
    const { data } = await apiFetch('global/antrean.php');
    const menunggu = data.filter(r => r.status_pendaftaran === 'menunggu_dokter');
    const el = $('#dashboard-antrean');
    if (menunggu.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada pasien menunggu.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Antrean</th><th>Pasien</th><th>JK / Umur</th><th>Tanda Vital</th><th></th>
          </tr></thead>
          <tbody>
            ${menunggu.slice(0, 10).map(r => {
              const td = [];
              if (r.suhu) td.push(`${r.suhu}°C`);
              if (r.sistolik && r.diastolik) td.push(`${r.sistolik}/${r.diastolik}`);
              if (r.nadi) td.push(`N:${r.nadi}`);
              return `<tr>
                <td class="cell-name">${esc(r.no_antrean || '—')}</td>
                <td>${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
                <td class="cell-muted">${r.jenis_kelamin === 'L' ? 'L' : 'P'} · ${age(r.tanggal_lahir)}</td>
                <td class="cell-muted">${td.length ? td.join(' · ') : '—'}</td>
                <td><button class="btn btn--primary btn--sm" data-panggil="${r.pendaftaran_id}">Panggil &amp; Periksa</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    $$('[data-panggil]').forEach(b => b.onclick = () =>
      panggilPasien(Number(b.dataset.panggil)));
  } catch (err) {
    $('#dashboard-antrean').innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}
