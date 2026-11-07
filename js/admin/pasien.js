import { state, apiFetch } from './config.js';
import { $, $$, esc, fmtDate } from '../global/utils.js';
import { openModal, closeModal, collectFields, markRequiredErrors } from '../global/modal.js';

export async function loadPasien(q = '') {
  const el = $('#pasien-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const { data } = await apiFetch('admin/pasien.php' + (q ? `?q=${encodeURIComponent(q)}` : ''));
    state.pasien = data;
    renderPasien();
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

function renderPasien() {
  const el = $('#pasien-table');
  if (state.pasien.length === 0) {
    el.innerHTML = '<div class="empty-state">Belum ada data pasien.</div>';
    return;
  }
  el.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead><tr>
          <th>No. RM</th><th>Nama</th><th>JK</th><th>Tgl Lahir</th><th>Telepon</th><th></th>
        </tr></thead>
        <tbody>
          ${state.pasien.map(p => `
            <tr>
              <td class="cell-muted">${esc(p.no_rm)}</td>
              <td class="cell-name">${esc(p.nama)}</td>
              <td>${p.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
              <td class="cell-muted">${fmtDate(p.tanggal_lahir)}</td>
              <td class="cell-muted">${esc(p.telepon || '—')}</td>
              <td>
                <div class="cell-actions">
                  <button class="btn btn--ghost btn--sm" data-edit-pasien="${esc(p.id)}">Edit</button>
                  <button class="btn btn--danger btn--sm" data-del-pasien="${esc(p.id)}">Hapus</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  $$('[data-edit-pasien]').forEach(b => b.onclick = () => editPasien(b.dataset.editPasien));
  $$('[data-del-pasien]').forEach(b => b.onclick = () => deletePasien(b.dataset.delPasien));
}

function pasienForm(p = {}) {
  return `
    <div class="form-grid">
      <div class="form-field">
        <label>Nama lengkap *</label>
        <input name="nama" value="${esc(p.nama || '')}" required />
        <p class="form-error">Wajib diisi.</p>
      </div>
      <div class="form-field">
        <label>Jenis kelamin *</label>
        <select name="jenis_kelamin">
          <option value="L" ${p.jenis_kelamin === 'L' ? 'selected' : ''}>Laki-laki</option>
          <option value="P" ${p.jenis_kelamin === 'P' ? 'selected' : ''}>Perempuan</option>
        </select>
      </div>
      <div class="form-field">
        <label>Tanggal lahir *</label>
        <input type="date" name="tanggal_lahir" value="${esc(p.tanggal_lahir || '')}" required />
        <p class="form-error">Wajib diisi.</p>
      </div>
      <div class="form-field">
        <label>Telepon</label>
        <input name="telepon" value="${esc(p.telepon || '')}" />
      </div>
      <div class="form-field">
        <label>Alamat</label>
        <textarea name="alamat">${esc(p.alamat || '')}</textarea>
      </div>
      <div class="form-field">
        <label>Alergi Obat / Makanan</label>
        <textarea name="alergi" placeholder="mis. penisilin, seafood (opsional)">${esc(p.alergi || '')}</textarea>
      </div>
    </div>`;
}

function editPasien(id) {
  const p = state.pasien.find(x => String(x.id) === String(id));
  if (!p) { console.warn('Pasien tidak ditemukan:', id); return; }

  openModal({
    title: 'Edit Pasien',
    bodyHtml: pasienForm(p),
    onSubmit: async () => {
      if (!markRequiredErrors()) return;
      await apiFetch('admin/pasien.php', {
        method: 'PUT',
        body: JSON.stringify({ id: p.id, ...collectFields() })
      });
      closeModal();
      loadPasien($('#pasien-search').value.trim());
    }
  });
}

async function deletePasien(id) {
  if (!confirm('Hapus pasien ini? Data pendaftaran terkait juga akan terhapus.')) return;
  try {
    await apiFetch('admin/pasien.php', { method: 'DELETE', body: JSON.stringify({ id }) });
    loadPasien($('#pasien-search').value.trim());
  } catch (err) { alert(err.message); }
}

export function initPasienEvents() {
  $('#btn-tambah-pasien').onclick = () => {
    openModal({
      title: 'Tambah Pasien',
      bodyHtml: pasienForm(),
      onSubmit: async () => {
        if (!markRequiredErrors()) return;
        await apiFetch('admin/pasien.php', {
          method: 'POST',
          body: JSON.stringify(collectFields())
        });
        closeModal();
        loadPasien($('#pasien-search').value.trim());
      }
    });
  };

  let searchTimer;
  $('#pasien-search').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadPasien(e.target.value.trim()), 300);
  });
}