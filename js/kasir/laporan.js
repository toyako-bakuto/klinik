import { API, apiFetch } from './config.js';
import { $, esc, fmtDate, fmtDateTime, fmtRupiah } from '../global/utils.js';

export async function loadLaporan() {
  const el = $('#laporan-container');
  el.innerHTML = '<div class="loading">Memuat…</div>';

  const dari   = $('#laporan-dari').value   || '2026-01-01';
  const sampai = $('#laporan-sampai').value || new Date().toISOString().slice(0, 10);

  try {
    const data = await apiFetch(`kasir/laporan.php?dari=${dari}&sampai=${sampai}`);
    el.innerHTML = `
      <div class="panel">
        <h3>Ringkasan ${fmtDate(data.dari)} – ${fmtDate(data.sampai)}</h3>
        <div class="total-box">
          <div class="total-row grand"><span>Total Pendapatan</span><span class="val">${fmtRupiah(data.total)}</span></div>
        </div>
        <div class="info-grid" style="margin-top:var(--space-4);">
          ${data.per_metode.length === 0
            ? '<div class="cell-muted">Belum ada transaksi.</div>'
            : data.per_metode.map(m => `
              <div class="info-item">
                <span class="k">${esc(m.metode)}</span>
                <span class="v">${fmtRupiah(m.total)} <small class="cell-muted">(${m.jml}x)</small></span>
              </div>`).join('')}
        </div>
      </div>

      <div class="panel">
        <h3>Detail Transaksi (${data.transaksi.length})</h3>
        ${data.transaksi.length === 0
          ? '<div class="cell-muted">Tidak ada transaksi pada rentang ini.</div>'
          : `<div class="table-wrapper"><table>
              <thead><tr>
                <th>Waktu</th><th>No. Tagihan</th><th>Pasien</th>
                <th>Metode</th><th class="cell-right">Nominal</th><th>Kasir</th>
              </tr></thead>
              <tbody>
                ${data.transaksi.map(t => `
                  <tr>
                    <td class="cell-muted">${fmtDateTime(t.created_at)}</td>
                    <td class="cell-muted">${esc(t.no_tagihan)}</td>
                    <td>${esc(t.pasien_nama)} <span class="cell-muted">(${esc(t.no_rm)})</span></td>
                    <td>${esc(t.metode)}</td>
                    <td class="cell-right">${fmtRupiah(t.nominal)}</td>
                    <td class="cell-muted">${esc(t.kasir_nama || '—')}</td>
                  </tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initLaporanEvents() {
  $('#btn-tampil-laporan').onclick = loadLaporan;
  $('#btn-export-csv').onclick = () => {
    const dari   = $('#laporan-dari').value   || '2026-01-01';
    const sampai = $('#laporan-sampai').value || new Date().toISOString().slice(0, 10);
    window.open(`${API}kasir/laporan.php?dari=${dari}&sampai=${sampai}&format=csv`, '_blank');
  };
}
