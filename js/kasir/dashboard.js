import { apiFetch } from './config.js';
import { $, esc, fmtRupiah } from '../global/utils.js';
import { renderTableTagihan, bindTagihanActions } from './tagihan.js';

export async function loadDashboard() {
  try {
    const { stats } = await apiFetch('global/stats.php');
    $('#stats-grid').innerHTML = `
      <div class="stat-card"><p class="stat-label">Pendapatan Hari Ini</p><p class="stat-value">${fmtRupiah(stats.pendapatan_hari_ini)}</p><p class="stat-hint">Total pembayaran</p></div>
      <div class="stat-card"><p class="stat-label">Transaksi Hari Ini</p><p class="stat-value">${stats.transaksi_hari_ini}</p><p class="stat-hint">Tagihan dibayar</p></div>
      <div class="stat-card"><p class="stat-label">Belum Bayar</p><p class="stat-value">${stats.belum_bayar}</p><p class="stat-hint">Tagihan</p></div>
      <div class="stat-card"><p class="stat-label">Sebagian</p><p class="stat-value">${stats.sebagian}</p><p class="stat-hint">DP / cicil</p></div>
    `;

    const { data } = await apiFetch('kasir/tagihan.php?status=belum_bayar');
    const el = $('#dashboard-belum');
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada tagihan belum lunas.</div>';
      return;
    }
    el.innerHTML = renderTableTagihan(data);
    bindTagihanActions();
  } catch (err) {
    $('#dashboard-belum').innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}
