import { state, apiFetch } from './config.js';
import { $, esc, fmtDateTime } from '../global/utils.js';
import { loadObatList } from './obat.js';

// ... sama persis

export async function loadStok() {
  const sel = $('#stok-filter-obat');
  // Isi dropdown obat (sekali)
  if (sel.options.length <= 1) {
    await loadObatList();
    state.obat.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.nama;
      sel.appendChild(opt);
    });
  }

  const el = $('#stok-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams();
    if (sel.value) params.set('obat_id', sel.value);
    if ($('#stok-dari').value)   params.set('dari', $('#stok-dari').value);
    if ($('#stok-sampai').value) params.set('sampai', $('#stok-sampai').value);

    const { data } = await apiFetch('apoteker/mutasi.php?' + params.toString());
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada mutasi stok.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr>
          <th>Waktu</th><th>Obat</th><th>Tipe</th><th>Jumlah</th><th>Stok Sebelum → Sesudah</th><th>Catatan</th><th>Oleh</th>
        </tr></thead>
        <tbody>
          ${data.map(m => `
            <tr>
              <td class="cell-muted">${fmtDateTime(m.created_at)}</td>
              <td class="cell-name">${esc(m.obat_nama)}</td>
              <td>${
                m.tipe === 'masuk'  ? '<span class="badge badge--done">Masuk</span>' :
                m.tipe === 'keluar' ? '<span class="badge badge--waiting">Keluar</span>' :
                                      '<span class="badge badge--progress">Koreksi</span>'
              }</td>
              <td>${m.jumlah}</td>
              <td class="cell-muted">${m.stok_sebelum} → ${m.stok_sesudah}</td>
              <td class="cell-muted">${esc(m.catatan || '—')}</td>
              <td class="cell-muted">${esc(m.user_nama || '—')}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initStokEvents() {
  $('#stok-filter-obat').addEventListener('change', loadStok);
  $('#stok-dari').addEventListener('change', loadStok);
  $('#stok-sampai').addEventListener('change', loadStok);
  $('#btn-refresh-stok').addEventListener('click', loadStok);
}
