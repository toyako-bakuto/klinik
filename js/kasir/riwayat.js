import { apiFetch, tagihanBadge } from './config.js';
import { $, $$, esc, fmtDate, fmtRupiah } from '../global/utils.js';
import { openPembayaran } from './pembayaran.js';
import { cetakKuitansi }  from './kuitansi.js';

export async function loadRiwayat() {
  const el = $('#riwayat-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams();
    params.set('tipe', 'kasir');
    if ($('#riwayat-dari').value)          params.set('dari', $('#riwayat-dari').value);
    if ($('#riwayat-sampai').value)        params.set('sampai', $('#riwayat-sampai').value);
    if ($('#riwayat-status').value)        params.set('status', $('#riwayat-status').value);
    if ($('#riwayat-search').value.trim()) params.set('q', $('#riwayat-search').value.trim());

    const { data } = await apiFetch('global/riwayat.php?' + params.toString());
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada transaksi.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr>
          <th>No. Tagihan</th><th>Tanggal</th><th>Pasien</th>
          <th>Total</th><th>Dibayar</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${data.map(t => `
            <tr>
              <td class="cell-muted">${esc(t.no_tagihan)}</td>
              <td class="cell-muted">${fmtDate(t.tanggal)}</td>
              <td class="cell-name">${esc(t.pasien_nama)} <span class="cell-muted">(${esc(t.no_rm)})</span></td>
              <td class="cell-right">${fmtRupiah(t.total)}</td>
              <td class="cell-right">${fmtRupiah(t.total_bayar)}</td>
              <td>${tagihanBadge(t.status)}</td>
              <td>
                <div class="cell-actions">
                  <button class="btn btn--ghost btn--sm" data-cetak="${t.id}">Cetak</button>
                  ${t.status !== 'lunas'
                    ? `<button class="btn btn--primary btn--sm" data-buka-tagihan="${t.id}">Bayar</button>`
                    : ''}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
    $$('[data-cetak]').forEach(b => b.onclick = () =>
      cetakKuitansi(Number(b.dataset.cetak)));
    $$('[data-buka-tagihan]').forEach(b => b.onclick = () =>
      openPembayaran(Number(b.dataset.bukaTagihan)));
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
