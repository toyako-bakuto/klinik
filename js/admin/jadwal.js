import { state, apiFetch } from './config.js';
import { $, $$, esc, fmtTime } from '../global/utils.js';
import { openModal, closeModal, collectFields, markRequiredErrors } from '../global/modal.js';
import { loadDokter } from './dokter.js';

export async function loadJadwal() {
  const el = $('#jadwal-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const { data } = await apiFetch('admin/jadwal.php');
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Belum ada jadwal dokter.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Dokter</th><th>Spesialis</th><th>Hari</th><th>Jam</th><th>Ruang</th><th></th>
          </tr></thead>
          <tbody>
            ${data.map(j => `
              <tr>
                <td class="cell-name">${esc(j.dokter_nama)}</td>
                <td>${esc(j.spesialis)}</td>
                <td>${esc(j.hari)}</td>
                <td class="cell-muted">${fmtTime(j.jam_mulai)} – ${fmtTime(j.jam_selesai)}</td>
                <td class="cell-muted">${esc(j.ruang || '—')}</td>
                <td>
                  <button class="btn btn--danger btn--sm" data-del-jadwal="${j.id}">Hapus</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    $$('[data-del-jadwal]').forEach(b => b.onclick = async () => {
      if (!confirm('Hapus jadwal ini?')) return;
      try {
        await apiFetch('admin/jadwal.php', { method: 'DELETE', body: JSON.stringify({ id: Number(b.dataset.delJadwal) }) });
        loadJadwal();
      } catch (err) { alert(err.message); }
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initJadwalEvents() {
  $('#btn-tambah-jadwal').onclick = async () => {
    if (state.dokter.length === 0) await loadDokter();
    const dokterOpts = state.dokter
      .map(d => `<option value="${d.id}">${esc(d.nama)} · ${esc(d.spesialis)}</option>`).join('');
    const hariOpts = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu']
      .map(h => `<option value="${h}">${h}</option>`).join('');

    openModal({
      title: 'Tambah Jadwal',
      bodyHtml: `
        <div class="form-grid">
          <div class="form-field"><label>Dokter *</label><select name="dokter_id" required>${dokterOpts}</select></div>
          <div class="form-field"><label>Hari *</label><select name="hari" required>${hariOpts}</select></div>
          <div class="form-field"><label>Jam mulai *</label><input type="time" name="jam_mulai" required /></div>
          <div class="form-field"><label>Jam selesai *</label><input type="time" name="jam_selesai" required /></div>
          <div class="form-field"><label>Ruang</label><input name="ruang" placeholder="mis. R-01" /></div>
        </div>`,
      onSubmit: async (btn) => {
        if (!markRequiredErrors()) return;
        btn.disabled = true; btn.textContent = 'Menyimpan…';
        try {
          await apiFetch('admin/jadwal.php', { method: 'POST', body: JSON.stringify(collectFields()) });
          closeModal();
          loadJadwal();
        } finally { btn.disabled = false; btn.textContent = 'Simpan'; }
      }
    });
  };
}
