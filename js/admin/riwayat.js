import { apiFetch, badge } from './config.js';
import { $, esc, fmtDate } from '../global/utils.js';

export async function loadRiwayat() {
  const el = $('#riwayat-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams({ mode: 'riwayat' });
    const dari   = $('#riwayat-dari').value;
    const sampai = $('#riwayat-sampai').value;
    const q      = $('#riwayat-search').value.trim();
    if (dari)   params.set('dari', dari);
    if (sampai) params.set('sampai', sampai);
    if (q)      params.set('q', q);

    const { data } = await apiFetch('admin/pendaftaran.php?' + params.toString());
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada riwayat pada rentang ini.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Tanggal</th><th>No. Reg</th><th>Pasien</th><th>Dokter</th><th>Keluhan</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${data.map(r => `
              <tr>
                <td class="cell-muted">${fmtDate(r.tanggal)}</td>
                <td class="cell-muted">${esc(r.no_reg)}</td>
                <td class="cell-name">${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
                <td>${esc(r.dokter_nama)} <span class="cell-muted">· ${esc(r.spesialis)}</span></td>
                <td class="cell-muted">${esc(r.keluhan || '—')}</td>
                <td>${badge(r.status)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initRiwayatEvents() {
  let riwayatTimer;
  ['#riwayat-dari', '#riwayat-sampai'].forEach(sel =>
    $(sel).addEventListener('change', () => loadRiwayat()));
  $('#riwayat-search').addEventListener('input', () => {
    clearTimeout(riwayatTimer);
    riwayatTimer = setTimeout(loadRiwayat, 300);
  });
}
