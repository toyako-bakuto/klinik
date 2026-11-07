import { apiFetch, badge } from './config.js';
import { $, $$, esc, fmtDateTime } from '../global/utils.js';
import { bukaSampel, aksiSampel, tolakPermintaan } from './sampel.js';
import { bukaHasil }    from './hasil.js';
import { bukaValidasi } from './validasi.js';

// ... sama persis

/* =========================================================
   LIST PERMINTAAN
   ========================================================= */
export async function loadPermintaan() {
  const el = $('#permintaan-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams();
    if ($('#permintaan-dari').value)   params.set('dari', $('#permintaan-dari').value);
    if ($('#permintaan-sampai').value) params.set('sampai', $('#permintaan-sampai').value);
    if ($('#permintaan-status').value) params.set('status', $('#permintaan-status').value);
    if ($('#permintaan-search').value.trim()) params.set('q', $('#permintaan-search').value.trim());

    const { data } = await apiFetch('lab/permintaan.php?' + params.toString());
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada permintaan lab.</div>';
      return;
    }
    el.innerHTML = renderPermintaanTable(data);
    bindAksiPermintaan();
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

function renderPermintaanTable(data) {
  return `
    <div class="table-wrapper"><table>
      <thead><tr>
        <th>Waktu</th><th>Pasien</th><th>Jenis Lab</th><th>Sampel</th><th>Status</th><th>Dokter</th><th></th>
      </tr></thead>
      <tbody>
        ${data.map(r => `
          <tr>
            <td class="cell-muted">${fmtDateTime(r.waktu_diminta)}</td>
            <td class="cell-name">${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
            <td>${esc(r.nama_lab)}</td>
            <td class="cell-muted">${esc(r.jenis_sampel || '—')}</td>
            <td>${badge(r.status)}</td>
            <td class="cell-muted">${esc(r.dokter_nama)}</td>
            <td>
              <div class="cell-actions">
                ${r.status === 'diminta'          ? `<button class="btn btn--primary btn--sm" data-ambil="${r.id}">Ambil Sampel</button>` : ''}
                ${r.status === 'sampel_diambil'   ? `<button class="btn btn--primary btn--sm" data-proses="${r.id}">Proses</button>` : ''}
                ${r.status === 'diproses'         ? `<button class="btn btn--primary btn--sm" data-input="${r.id}">Input Hasil</button>` : ''}
                ${r.status === 'hasil_diinput'    ? `<button class="btn btn--primary btn--sm" data-validasi="${r.id}">Validasi</button>` : ''}
                ${['diminta','sampel_diambil','diproses'].includes(r.status)
                  ? `<button class="btn btn--danger btn--sm" data-tolak="${r.id}">Tolak</button>` : ''}
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

function bindAksiPermintaan() {
  $$('[data-ambil]').forEach(b => b.onclick = () => bukaSampel(Number(b.dataset.ambil)));
  $$('[data-proses]').forEach(b => b.onclick = () => aksiSampel(Number(b.dataset.proses), 'proses'));
  $$('[data-input]').forEach(b => b.onclick = () => bukaHasil(Number(b.dataset.input)));
  $$('[data-validasi]').forEach(b => b.onclick = () => bukaValidasi(Number(b.dataset.validasi)));
  $$('[data-tolak]').forEach(b => b.onclick = () => tolakPermintaan(Number(b.dataset.tolak)));
}

/* =========================================================
   INIT EVENTS
   ========================================================= */
export function initPermintaanEvents() {
  ['#permintaan-dari', '#permintaan-sampai', '#permintaan-status'].forEach(s =>
    $(s).addEventListener('change', loadPermintaan));

  let permintaanTimer;
  $('#permintaan-search').addEventListener('input', () => {
    clearTimeout(permintaanTimer);
    permintaanTimer = setTimeout(loadPermintaan, 300);
  });
}
