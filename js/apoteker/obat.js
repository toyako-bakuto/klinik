import { state, apiFetch } from './config.js';
import { $, $$, esc, fmtRupiah } from '../global/utils.js';
import {
  openModal,
  closeModal,
  collectFields
} from '../global/modal.js';
// ... sama persis

export async function loadObatList() {
  try {
    const { data } = await apiFetch('apoteker/obat.php');
    state.obat = data;
    return data;
  } catch { return []; }
}

export function renderObat() {
  const el = $('#obat-table');
  const list = state.obat;
  if (list.length === 0) {
    el.innerHTML = '<div class="empty-state">Belum ada data obat.</div>';
    return;
  }
  el.innerHTML = `
    <div class="table-wrapper"><table>
      <thead><tr>
        <th>Nama</th><th>Satuan</th><th>Harga</th><th>Stok</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>
        ${list.map(o => `
          <tr>
            <td class="cell-name">${esc(o.nama)}</td>
            <td>${esc(o.satuan)}</td>
            <td class="cell-muted">${fmtRupiah(o.harga)}</td>
            <td>${o.stok <= 10
              ? `<span class="badge badge--danger">${o.stok}</span>`
              : `<span class="badge badge--done">${o.stok}</span>`}</td>
            <td>${o.aktif == 1
              ? '<span class="badge badge--done">Aktif</span>'
              : '<span class="badge badge--cancel">Nonaktif</span>'}</td>
            <td>
              <div class="cell-actions">
                <button class="btn btn--ghost btn--sm" data-edit-obat="${o.id}">Edit</button>
                <button class="btn btn--ghost btn--sm" data-stok-masuk="${o.id}">+ Stok</button>
                <button class="btn btn--ghost btn--sm" data-stok-koreksi="${o.id}">Koreksi</button>
                ${o.aktif == 1
                  ? `<button class="btn btn--danger btn--sm" data-del-obat="${o.id}">Nonaktifkan</button>`
                  : ''}
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  $$('[data-edit-obat]').forEach(b => b.onclick = () => editObat(Number(b.dataset.editObat)));
  $$('[data-stok-masuk]').forEach(b => b.onclick = () => stokMasuk(Number(b.dataset.stokMasuk)));
  $$('[data-stok-koreksi]').forEach(b => b.onclick = () => stokKoreksi(Number(b.dataset.stokKoreksi)));
  $$('[data-del-obat]').forEach(b => b.onclick = () => nonaktifkanObat(Number(b.dataset.delObat)));
}

/* =========================================================
   FORM & MODALS
   ========================================================= */
function obatForm(o = {}) {
  return `
    <div class="form-grid">
      <div class="form-field"><label>Nama Obat *</label>
        <input name="nama" value="${esc(o.nama || '')}" required /></div>
      <div class="form-field"><label>Satuan</label>
        <input name="satuan" value="${esc(o.satuan || 'tablet')}" /></div>
      <div class="form-field"><label>Harga</label>
        <input type="number" step="0.01" name="harga" value="${o.harga || 0}" /></div>
      <div class="form-field"><label>Keterangan</label>
        <textarea name="keterangan">${esc(o.keterangan || '')}</textarea></div>
    </div>`;
}

export function initObatEvents() {
  $('#btn-tambah-obat').onclick = () => {
    openModal({
      title: 'Tambah Obat',
      bodyHtml: obatForm(),
      onSubmit: async (btn) => {
        const data = collectFields();
        if (!data.nama) { alert('Nama obat wajib diisi.'); return; }
        btn.disabled = true; btn.textContent = 'Menyimpan…';
        try {
          await apiFetch('apoteker/obat.php', { method: 'POST', body: JSON.stringify(data) });
          closeModal();
          await loadObatList(); renderObat();
        } finally { btn.disabled = false; btn.textContent = 'Simpan'; }
      }
    });
  };

  // Debounced search
  let obatTimer;
  $('#obat-search').addEventListener('input', async () => {
    clearTimeout(obatTimer);
    obatTimer = setTimeout(async () => {
      const q = $('#obat-search').value.trim();
      try {
        const { data } = await apiFetch('apoteker/obat.php' + (q ? '?q=' + encodeURIComponent(q) : ''));
        state.obat = data;
        renderObat();
      } catch (err) { alert(err.message); }
    }, 300);
  });
}

function editObat(id) {
  const o = state.obat.find(x => x.id == id);
  if (!o) return;
  openModal({
    title: 'Edit Obat',
    bodyHtml: obatForm(o),
    onSubmit: async (btn) => {
      const data = { id, ...collectFields() };
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        await apiFetch('apoteker/obat.php', { method: 'PUT', body: JSON.stringify(data) });
        closeModal();
        await loadObatList(); renderObat();
      } finally { btn.disabled = false; btn.textContent = 'Simpan'; }
    }
  });
}

function stokMasuk(id) {
  const o = state.obat.find(x => x.id == id);
  openModal({
    title: `Stok Masuk — ${o?.nama || ''}`,
    bodyHtml: `
      <div class="form-grid">
        <div class="form-field"><label>Jumlah *</label>
          <input type="number" name="jumlah" min="1" value="1" required /></div>
        <div class="form-field"><label>Catatan</label>
          <input name="catatan" placeholder="mis. pembelian dari supplier" /></div>
      </div>`,
    onSubmit: async (btn) => {
      const fields = collectFields();
      const jumlah = parseInt(fields.jumlah || '0', 10);
      const catatan = fields.catatan || '';
      if (jumlah <= 0) { alert('Jumlah harus > 0.'); return; }
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        await apiFetch('apoteker/obat.php', {
          method: 'PUT',
          body: JSON.stringify({ id, action: 'stok_masuk', jumlah, catatan })
        });
        closeModal();
        await loadObatList(); renderObat();
      } finally { btn.disabled = false; btn.textContent = 'Simpan'; }
    }
  });
}

function stokKoreksi(id) {
  const o = state.obat.find(x => x.id == id);
  openModal({
    title: `Koreksi Stok — ${o?.nama || ''}`,
    bodyHtml: `
      <div class="form-grid">
        <div class="form-field"><label>Stok Baru *</label>
          <input type="number" name="stok_baru" min="0" value="${o?.stok || 0}" required /></div>
        <div class="form-field"><label>Catatan</label>
          <input name="catatan" placeholder="mis. hasil stock opname" /></div>
      </div>`,
    onSubmit: async (btn) => {
      const fields = collectFields();
      const stokBaru = parseInt(fields.stok_baru || '0', 10);
      const catatan = fields.catatan || '';
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        await apiFetch('apoteker/obat.php', {
          method: 'PUT',
          body: JSON.stringify({ id, action: 'stok_koreksi', stok_baru: stokBaru, catatan })
        });
        closeModal();
        await loadObatList(); renderObat();
      } finally { btn.disabled = false; btn.textContent = 'Simpan'; }
    }
  });
}

async function nonaktifkanObat(id) {
  if (!confirm('Nonaktifkan obat ini?')) return;
  try {
    await apiFetch('apoteker/obat.php', { method: 'DELETE', body: JSON.stringify({ id }) });
    await loadObatList(); renderObat();
  } catch (err) { alert(err.message); }
}
