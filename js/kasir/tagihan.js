import { apiFetch, tagihanBadge } from './config.js';
import { $, $$, esc, fmtDate, fmtRupiah } from '../global/utils.js';

export function renderTableTagihan(data) {
  return `
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
                <button class="btn btn--primary btn--sm" data-buka-tagihan="${t.id}">
                  ${t.status === 'lunas' ? 'Lihat' : 'Bayar'}
                </button>
                ${t.status === 'lunas'
                  ? `<button class="btn btn--ghost btn--sm" data-cetak="${t.id}">Cetak</button>`
                  : ''}
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

export function bindTagihanActions() {
  const hooks = window.__kasirHooks || {};
  if (hooks.openPembayaran) {
    $$('[data-buka-tagihan]').forEach(b => b.onclick = () =>
      hooks.openPembayaran(Number(b.dataset.bukaTagihan)));
  }
  if (hooks.cetakKuitansi) {
    $$('[data-cetak]').forEach(b => b.onclick = () =>
      hooks.cetakKuitansi(Number(b.dataset.cetak)));
  }
}

export async function loadTagihan() {
  const el = $('#tagihan-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams();
    if ($('#tagihan-dari').value)          params.set('dari', $('#tagihan-dari').value);
    if ($('#tagihan-sampai').value)        params.set('sampai', $('#tagihan-sampai').value);
    if ($('#tagihan-status').value)        params.set('status', $('#tagihan-status').value);
    if ($('#tagihan-search').value.trim()) params.set('q', $('#tagihan-search').value.trim());

    const { data } = await apiFetch('kasir/tagihan.php?' + params.toString());
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada tagihan.</div>';
      return;
    }
    el.innerHTML = renderTableTagihan(data);
    bindTagihanActions();
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initTagihanEvents() {
  ['#tagihan-dari', '#tagihan-sampai', '#tagihan-status'].forEach(s =>
    $(s).addEventListener('change', loadTagihan));

  let tagihanTimer;
  $('#tagihan-search').addEventListener('input', () => {
    clearTimeout(tagihanTimer);
    tagihanTimer = setTimeout(loadTagihan, 300);
  });
}
