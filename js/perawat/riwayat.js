import { apiFetch, badge } from './config.js';
import { $, esc, fmtDate } from '../global/utils.js';

// ... sama persis
export async function loadRiwayat() {
  const el = $('#riwayat-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams();
    params.set('tipe', 'perawat');
    if ($('#riwayat-dari').value)   params.set('dari', $('#riwayat-dari').value);
    if ($('#riwayat-sampai').value) params.set('sampai', $('#riwayat-sampai').value);
    if ($('#riwayat-search').value.trim()) params.set('q', $('#riwayat-search').value.trim());

    const { data } = await apiFetch('global/riwayat.php?' + params.toString());
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada riwayat pemeriksaan.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Tanggal</th><th>Pasien</th><th>Dokter</th><th>Tanda Vital</th><th>Perawat</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${data.map(r => {
              const td = [];
              if (r.suhu) td.push(`${r.suhu}°C`);
              if (r.sistolik && r.diastolik) td.push(`${r.sistolik}/${r.diastolik}`);
              if (r.nadi) td.push(`N:${r.nadi}`);
              if (r.pernapasan) td.push(`RR:${r.pernapasan}`);
              if (r.saturasi_oksigen) td.push(`SpO₂:${r.saturasi_oksigen}%`);
              return `
                <tr>
                  <td class="cell-muted">${fmtDate(r.tanggal)}</td>
                  <td>${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
                  <td>${esc(r.dokter_nama)} <span class="cell-muted">· ${esc(r.spesialis)}</span></td>
                  <td class="cell-muted">${td.length ? td.join(' · ') : '—'}</td>
                  <td class="cell-muted">${esc(r.perawat_nama)}</td>
                  <td>${badge(r.status)}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initRiwayatEvents() {
  let riwayatTimer;
  ['#riwayat-dari', '#riwayat-sampai'].forEach(s =>
    $(s).addEventListener('change', () => loadRiwayat()));
  $('#riwayat-search').addEventListener('input', () => {
    clearTimeout(riwayatTimer);
    riwayatTimer = setTimeout(loadRiwayat, 300);
  });
}
