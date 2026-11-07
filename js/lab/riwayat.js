import { apiFetch, badge } from './config.js';
import { $, esc, fmtDate, fmtDateTime } from '../global/utils.js';

// ... sama persis

export async function loadRiwayat() {
  const el = $('#riwayat-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams();
    
    params.set('tipe', 'lab');
    if ($('#riwayat-dari').value)   params.set('dari', $('#riwayat-dari').value);
    if ($('#riwayat-sampai').value) params.set('sampai', $('#riwayat-sampai').value);
    if ($('#riwayat-status').value) params.set('status', $('#riwayat-status').value);
    if ($('#riwayat-search').value.trim()) params.set('q', $('#riwayat-search').value.trim());

    const { data } = await apiFetch('global/riwayat.php?' + params.toString());
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada riwayat.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr>
          <th>Tanggal</th><th>Pasien</th><th>Jenis Lab</th><th>Hasil</th><th>Status</th><th>Validasi</th>
        </tr></thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td class="cell-muted">${fmtDate(r.tanggal)}</td>
              <td class="cell-name">${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
              <td>${esc(r.nama_lab)}</td>
              <td class="cell-muted" style="max-width:220px;white-space:normal;">${esc((r.hasil||'—').substring(0,120))}${(r.hasil||'').length>120?'…':''}</td>
              <td>${badge(r.status)}</td>
              <td class="cell-muted">
                ${esc(r.valid_oleh || '—')}<br><small>${r.divalidasi_at ? fmtDateTime(r.divalidasi_at) : ''}</small>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initRiwayatEvents() {
  ['#riwayat-dari', '#riwayat-sampai', '#riwayat-status'].forEach(s =>
    $(s).addEventListener('change', loadRiwayat));
  let riwayatTimer;
  $('#riwayat-search').addEventListener('input', () => {
    clearTimeout(riwayatTimer);
    riwayatTimer = setTimeout(loadRiwayat, 300);
  });
}
