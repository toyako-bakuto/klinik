import { state, apiFetch, badge, STATUS_LABEL } from './config.js';
import { $, $$, esc, fmtDate } from '../global/utils.js';
import { openModal, closeModal, collectFields, markRequiredErrors, showModalAlert } from '../global/modal.js';
import { loadPasien } from './pasien.js';
import { loadDokter } from './dokter.js';

export async function loadPendaftaran() {
  const tglInput = $('#pendaftaran-tanggal');

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  if (!tglInput.value) tglInput.value = today;

  const el = $('#pendaftaran-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';


  try {
    const { data } = await apiFetch(
        'admin/pendaftaran.php?tanggal=' + encodeURIComponent(tglInput.value)
    );

    if (data.length === 0) {
        const message = tglInput.value === today
            ? 'Belum ada pendaftaran hari ini.'
            : 'Belum ada pendaftaran pada tanggal ini.';

        el.innerHTML = `<div class="empty-state">${message}</div>`;
        return;
    }

    // Lanjutkan render tabel...

    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>No. Reg</th><th>Pasien</th><th>Dokter</th><th>Tanggal</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${data.map(r => `
              <tr>
                <td class="cell-muted">${esc(r.no_reg)}</td>
                <td class="cell-name">${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
                <td>${esc(r.dokter_nama)} <span class="cell-muted">· ${esc(r.spesialis)}</span></td>
                <td class="cell-muted">${fmtDate(r.tanggal)}</td>
                <td>${badge(r.status)}</td>
                <td>
                  <div class="cell-actions">
                    <select data-status-pendaftaran="${r.id}" class="btn btn--ghost btn--sm">
                      ${['menunggu','menunggu_dokter','diperiksa','menunggu_lab','selesai','batal'].map(s =>
                        `<option value="${s}" ${r.status===s?'selected':''}>${STATUS_LABEL[s].label}</option>`
                      ).join('')}
                    </select>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    $$('[data-status-pendaftaran]').forEach(sel => {
      sel.onchange = async () => {
        const id = Number(sel.dataset.statusPendaftaran);
        try {
          await apiFetch('admin/pendaftaran.php', {
            method: 'PUT',
            body: JSON.stringify({ id, status: sel.value })
          });
          loadPendaftaran();
        } catch (err) {
          alert(err.message);
          loadPendaftaran();
        }
      };
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initPendaftaranEvents() {
  $('#pendaftaran-tanggal').addEventListener('change', loadPendaftaran);

  $('#btn-tambah-pendaftaran').onclick = async () => {
    if (state.pasien.length === 0) await loadPasien();
    if (state.dokter.length === 0) await loadDokter();

    if (state.pasien.length === 0) {
      alert('Belum ada data pasien. Tambahkan pasien terlebih dahulu.');
      return;
    }

    const pasienOpts = state.pasien
      .map(p => `<option value="${p.id}">${esc(p.nama)} (${esc(p.no_rm)})</option>`).join('');
    const dokterOpts = state.dokter
      .map(d => `<option value="${d.id}">${esc(d.nama)} · ${esc(d.spesialis)}</option>`).join('');

    const today = new Date().toISOString().slice(0, 10);

    openModal({
      title: 'Pendaftaran Baru',
      bodyHtml: `
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
            <input type="date" name="tanggal" value="${today}" required />
            <p class="form-error">Wajib diisi.</p>
          </div>
          <div class="form-field">
            <label>Keluhan</label>
            <textarea name="keluhan"></textarea>
          </div>
        </div>`,
      onSubmit: async (btn) => {
  if (!markRequiredErrors()) return;

  // Validasi tambahan: pastikan field benar-benar terisi
  const fields = collectFields();
  if (!fields.pasien_id) {
    showModalAlert('Pilih pasien terlebih dahulu.');
    return;
  }
  if (!fields.dokter_id) {
    showModalAlert('Pilih dokter terlebih dahulu.');
    return;
  }
  if (!fields.tanggal) {
    showModalAlert('Tanggal wajib diisi.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan…';
  try {
    const res = await apiFetch('admin/pendaftaran.php', {
      method: 'POST',
      body: JSON.stringify(fields)
    });
    closeModal();
    loadPendaftaran();
    alert(`Pendaftaran berhasil. No. Antrean: ${res.no_antrean}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
}
    });
  };
}
