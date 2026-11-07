import { apiFetch } from './config.js';
import { $, $$, esc, fmtDate, fmtDateTime, fmtRupiah } from '../global/utils.js';

export async function loadKuitansiList() {
  const el = $('#kuitansi-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const { data } = await apiFetch(`global/riwayat.php?tipe=kasir&status=${status}`)
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada transaksi lunas.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr>
          <th>No. Tagihan</th><th>Tanggal</th><th>Pasien</th><th>Total</th><th></th>
        </tr></thead>
        <tbody>
          ${data.map(t => `
            <tr>
              <td class="cell-muted">${esc(t.no_tagihan)}</td>
              <td class="cell-muted">${fmtDate(t.tanggal)}</td>
              <td class="cell-name">${esc(t.pasien_nama)}</td>
              <td class="cell-right">${fmtRupiah(t.total)}</td>
              <td><button class="btn btn--primary btn--sm" data-cetak="${t.id}">Cetak Kuitansi</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
    $$('[data-cetak]').forEach(b => b.onclick = () =>
      cetakKuitansi(Number(b.dataset.cetak)));
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export async function cetakKuitansi(tagihanId) {
  try {
    const data = await apiFetch('kasir/kuitansi.php?tagihan_id=' + tagihanId);
    const html = buildKuitansiHtml(data);
    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  } catch (err) { alert(err.message); }
}

function buildKuitansiHtml(d) {
  const { tagihan: t, items, pembayaran } = d;
  const total = parseFloat(t.total);
  const totalBayar = parseFloat(t.total_bayar);

  const totalByMetode = {};
  pembayaran.filter(p => p.void == 0).forEach(p => {
    totalByMetode[p.metode] = (totalByMetode[p.metode] || 0) + parseFloat(p.nominal);
  });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Kuitansi ${esc(t.no_tagihan)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, sans-serif; margin: 20px; color:#212529; font-size:14px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; }
    h1 { font-size:20px; margin:0; }
    .brand { font-size:22px; font-weight:800; letter-spacing:2px; }
    .muted { color:#6c757d; font-size:12px; }
    .box { border:1px solid #dee2e6; padding:12px; border-radius:6px; }
    .row { display:flex; justify-content:space-between; padding:4px 0; }
    .row.grand { border-top:1px solid #212529; margin-top:6px; padding-top:6px; font-weight:700; font-size:16px; }
    table { width:100%; border-collapse:collapse; margin:12px 0; }
    th, td { padding:6px 4px; border-bottom:1px solid #e9ecef; text-align:left; font-size:13px; }
    th { background:#f8f9fa; font-size:12px; text-transform:uppercase; }
    .right { text-align:right; }
    .ttd { margin-top:40px; display:flex; justify-content:flex-end; }
    .ttd div { text-align:center; }
    @media print { body { margin:0; } }
  </style></head><body>

  <div class="head">
    <div>
      <div class="brand">✚ KLINIK SEHAT</div>
      <div class="muted">Jl. Kesehatan No. 1 · Telp 021-xxxx</div>
    </div>
    <div style="text-align:right;">
      <h1>KUITANSI</h1>
      <div class="muted">${esc(t.no_tagihan)}</div>
      <div class="muted">${fmtDateTime(t.created_at)}</div>
    </div>
  </div>

  <div class="box" style="margin-bottom:12px;">
    <div class="row"><span>Pasien</span><span><strong>${esc(t.pasien_nama)}</strong> (${esc(t.no_rm)})</span></div>
    <div class="row"><span>No. Reg</span><span>${esc(t.no_reg)}</span></div>
    <div class="row"><span>Tanggal</span><span>${fmtDate(t.tanggal)}</span></div>
    <div class="row"><span>Dokter</span><span>${esc(t.dokter_nama)} (${esc(t.spesialis)})</span></div>
  </div>

  <table>
    <thead><tr><th>Tipe</th><th>Item</th><th class="right">Qty</th><th class="right">Harga</th><th class="right">Subtotal</th></tr></thead>
    <tbody>
      ${items.map(it => `
        <tr>
          <td>${esc(it.tipe)}</td>
          <td>${esc(it.nama)}</td>
          <td class="right">${it.qty}</td>
          <td class="right">${fmtRupiah(it.harga_satuan)}</td>
          <td class="right">${fmtRupiah(it.subtotal)}</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <div class="box">
    <div class="row"><span>Total</span><span>${fmtRupiah(total)}</span></div>
    <div class="row"><span>Dibayar</span><span>${fmtRupiah(totalBayar)}</span></div>
    <div class="row grand"><span>Status</span><span>${t.status.toUpperCase()}</span></div>
    ${Object.keys(totalByMetode).length ? `
      <div class="row" style="margin-top:8px;border-top:1px dashed #dee2e6;padding-top:8px;">
        <span class="muted">Metode:</span>
        <span class="muted">${Object.entries(totalByMetode).map(([m,v]) => `${m} ${fmtRupiah(v)}`).join(' · ')}</span>
      </div>` : ''}
  </div>

  <div class="ttd">
    <div>
      <div class="muted">Kasir</div>
      <div style="height:60px;"></div>
      <div>(${esc(pembayaran[0]?.kasir_nama || '—')})</div>
    </div>
  </div>

  <p class="muted" style="margin-top:20px;text-align:center;">Terima kasih atas kunjungan Anda.</p>

  </body></html>`;
}

export function initKuitansiEvents() {
  $('#btn-refresh-kuitansi')?.addEventListener('click', loadKuitansiList);
}

export function registerKuitansiHooks() {
  window.__kasirHooks = window.__kasirHooks || {};
  window.__kasirHooks.cetakKuitansi = cetakKuitansi;
}
