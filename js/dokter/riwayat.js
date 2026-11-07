import { apiFetch, badge } from './config.js';
import { $, $$, esc, fmtDate } from '../global/utils.js';
import { panggilPasien } from './antrean.js';

// ... sama persis

export async function loadRiwayat() {
  const el = $('#riwayat-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams();

    params.set('tipe', 'dokter');

    if ($('#riwayat-dari').value)
        params.set('dari', $('#riwayat-dari').value);

    if ($('#riwayat-sampai').value)
        params.set('sampai', $('#riwayat-sampai').value);

    if ($('#riwayat-search').value.trim())
        params.set('q', $('#riwayat-search').value.trim());

    const { data } = await apiFetch('global/riwayat.php?' + params.toString());
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada riwayat pemeriksaan.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Tanggal</th><th>Pasien</th><th>Diagnosis</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${data.map(r => `
              <tr>
                <td class="cell-muted">${fmtDate(r.tanggal)}</td>
                <td>${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
                <td>${esc(r.diagnosis_utama || '—')} ${r.diagnosis_kode ? `<span class="cell-muted">(${esc(r.diagnosis_kode)})</span>` : ''}</td>
                <td>${badge(r.status)}</td>
                <td><button class="btn btn--ghost btn--sm" data-lihat-rm="${r.pendaftaran_id}">Lihat</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    $$('[data-lihat-rm]').forEach(b => b.onclick = () =>
      panggilPasien(Number(b.dataset.lihatRm)));
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initRiwayatEvents() {
  let riwayatTimer;
  ['#riwayat-dari', '#riwayat-sampai'].forEach(s =>
    $(s).addEventListener('change', loadRiwayat));
  $('#riwayat-search').addEventListener('input', () => {
    clearTimeout(riwayatTimer);
    riwayatTimer = setTimeout(loadRiwayat, 300);
  });
}
