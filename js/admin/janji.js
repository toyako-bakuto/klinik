import { state, apiFetch, JANJI_LABEL } from './config.js';
import { $, $$, esc, fmtDate, fmtTime, makeBadge } from '../global/utils.js';
import { openModal, closeModal, collectFields, markRequiredErrors } from '../global/modal.js';
import { loadPasien } from './pasien.js';
import { loadDokter } from './dokter.js';

// Satu-satunya deklarasi janjiBadge — pakai factory makeBadge
const janjiBadge = makeBadge(JANJI_LABEL);

export async function loadJanji() {
  const el = $('#janji-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const params = new URLSearchParams();
    const tgl = $('#janji-tanggal').value;
    const st  = $('#janji-status').value;
    if (tgl) params.set('tanggal', tgl);
    if (st)  params.set('status', st);

    const { data } = await apiFetch('admin/janji-temu.php?' + params.toString());
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada janji temu.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>No. Janji</th><th>Tanggal</th><th>Jam</th><th>Pasien</th>
            <th>Dokter</th><th>Keperluan</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${data.map(j => `
              <tr>
                <td class="cell-muted">${esc(j.no_janji)}</td>
                <td class="cell-muted">${fmtDate(j.tanggal)}</td>
                <td class="cell-muted">${fmtTime(j.jam)}</td>
                <td class="cell-name">${esc(j.pasien_nama)} <span class="cell-muted">(${esc(j.no_rm)})</span></td>
                <td>${esc(j.dokter_nama)} <span class="cell-muted">· ${esc(j.spesialis)}</span></td>
                <td class="cell-muted">${esc(j.keperluan || '—')}</td>
                <td>${janjiBadge(j.status)}</td>
                <td>
                  <div class="cell-actions">
                    <button class="btn btn--ghost btn--sm" data-edit-janji="${j.id}">Edit</button>
                    <button class="btn btn--danger btn--sm" data-del-janji="${j.id}">Hapus</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    $$('[data-edit-janji]').forEach(b => b.onclick = () =>
      editJanji(Number(b.dataset.editJanji), data));
    $$('[data-del-janji]').forEach(b => b.onclick = () =>
      deleteJanji(Number(b.dataset.delJanji)));
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

function janjiForm(j = {}) {
  const pasienOpts = state.pasien
    .map(p => `<option value="${p.id}" ${j.pasien_id===p.id?'selected':''}>${esc(p.nama)} (${esc(p.no_rm)})</option>`)
    .join('');
  const dokterOpts = state.dokter
    .map(d => `<option value="${d.id}" ${j.dokter_id===d.id?'selected':''}>${esc(d.nama)} · ${esc(d.spesialis)}</option>`)
    .join('');
  const statusOpts = ['dijadwalkan','dikonfirmasi','selesai','dibatalkan']
    .map(s => `<option value="${s}" ${j.status===s?'selected':''}>${JANJI_LABEL[s].label}</option>`)
    .join('');

  return `
    <div class="form-grid">
      <div class="form-field">
        <label>Pasien *</label>
        <select name="pasien_id" required>${pasienOpts}</select>
      </div>
      <div class="form-field">
        <label>Dokter *</label>
        <select name="dokter_id" required>${dokterOpts}</select>
      </div>
      <div class="form-field">
        <label>Tanggal *</label>
        <input type="date" name="tanggal" value="${esc(j.tanggal || new Date().toISOString().slice(0,10))}" required />
        <p class="form-error">Wajib diisi.</p>
      </div>
      <div class="form-field">
        <label>Jam *</label>
        <input type="time" name="jam" value="${esc((j.jam || '').substring(0,5))}" required />
        <p class="form-error">Wajib diisi.</p>
      </div>
      <div class="form-field">
        <label>Keperluan</label>
        <textarea name="keperluan">${esc(j.keperluan || '')}</textarea>
      </div>
      ${j.id ? `<div class="form-field">
        <label>Status</label>
        <select name="status">${statusOpts}</select>
      </div>` : ''}
    </div>`;
}

function editJanji(id, data) {
  const j = data.find(x => x.id === id);
  if (!j) return;
  openModal({
    title: 'Edit Janji Temu',
    bodyHtml: janjiForm(j),
    onSubmit: async (btn) => {
      if (!markRequiredErrors()) return;
      btn.disabled = true; btn.textContent = 'Menyimpan…';
      try {
        await apiFetch('admin/janji-temu.php', {
          method: 'PUT',
          body: JSON.stringify({ id, ...collectFields() })
        });
        closeModal();
        loadJanji();
      } finally { btn.disabled = false; btn.textContent = 'Simpan'; }
    }
  });
}

async function deleteJanji(id) {
  if (!confirm('Hapus janji temu ini?')) return;
  try {
    await apiFetch('admin/janji-temu.php', { method: 'DELETE', body: JSON.stringify({ id }) });
    loadJanji();
  } catch (err) { alert(err.message); }
}

export function initJanjiEvents() {
  $('#btn-tambah-janji').onclick = async () => {
    if (state.pasien.length === 0) await loadPasien();
    if (state.dokter.length === 0) await loadDokter();
    if (state.pasien.length === 0) {
      alert('Belum ada data pasien. Tambahkan pasien terlebih dahulu.');
      return;
    }
    openModal({
      title: 'Buat Janji Temu',
      bodyHtml: janjiForm(),
      onSubmit: async (btn) => {
        if (!markRequiredErrors()) return;
        btn.disabled = true; btn.textContent = 'Menyimpan…';
        try {
          const res = await apiFetch('admin/janji-temu.php', {
            method: 'POST',
            body: JSON.stringify(collectFields())
          });
          closeModal();
          loadJanji();
          alert(`Janji temu dibuat. No: ${res.no_janji}`);
        } finally { btn.disabled = false; btn.textContent = 'Simpan'; }
      }
    });
  };

  $('#janji-tanggal').addEventListener('change', loadJanji);
  $('#janji-status').addEventListener('change', loadJanji);
}
