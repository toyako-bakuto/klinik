import { state, apiFetch } from './config.js';
import { $, esc } from '../global/utils.js';
import { reloadRM, saveRMFieldsSilently } from './rm-form.js';

// ... sama persis

/* -------- Render panel lab -------- */
export function renderLabPanel(lab, isSelesai) {
  return `
    <div class="panel">
      <h3>Permintaan Laboratorium</h3>
      <p class="panel-sub">
        ${isSelesai
          ? 'Dikelola oleh petugas laboratorium.'
          : 'Permintaan dibuat dari sini, hasil diinput & divalidasi di portal lab.'}
      </p>
      <div id="lab-list">
        ${lab.length === 0
          ? '<div class="cell-muted" style="font-size:var(--text-sm);">Belum ada permintaan lab.</div>'
          : lab.map(l => `
              <div class="list-item">
                <div style="flex:1;">
                  <div class="t-name">
                    ${esc(l.nama_lab)}
                    ${l.status === 'divalidasi'       ? '<span class="badge badge--done" style="margin-left:6px;">Divalidasi</span>' : ''}
                    ${l.status === 'ditolak'          ? '<span class="badge badge--danger" style="margin-left:6px;">Ditolak</span>' : ''}
                    ${l.status === 'hasil_diinput'    ? '<span class="badge badge--progress" style="margin-left:6px;">Menunggu Validasi</span>' : ''}
                    ${l.status === 'diproses'         ? '<span class="badge badge--progress" style="margin-left:6px;">Diproses</span>' : ''}
                    ${l.status === 'sampel_diambil'   ? '<span class="badge badge--waiting" style="margin-left:6px;">Sampel Diambil</span>' : ''}
                  </div>
                  ${l.catatan ? `<div class="t-ket">Catatan: ${esc(l.catatan)}</div>` : ''}
                  ${l.status === 'divalidasi' && l.hasil
                    ? `<div class="t-ket" style="color:var(--color-text);white-space:pre-wrap;"><strong>Hasil:</strong> ${esc(l.hasil)}</div>` : ''}
                  ${l.status === 'divalidasi' && l.kesan
                    ? `<div class="t-ket"><strong>Kesan:</strong> ${esc(l.kesan)}</div>` : ''}
                </div>
              </div>`).join('')}
      </div>
      ${!isSelesai ? `
      <div class="form-grid cols-2" style="margin-top:var(--space-4);">
        <div class="form-field">
          <label>Pilih Pemeriksaan</label>
          <select id="f-lab-id">
            <option value="">— pilih lab —</option>
            ${state.masterLab.map(l => `<option value="${l.id}" data-nama="${esc(l.nama)}">${esc(l.nama)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Atau nama manual</label>
          <input id="f-lab-nama" placeholder="(opsional)" />
        </div>
        <div class="form-field">
          <label>Catatan</label>
          <input id="f-lab-catatan" />
        </div>
      </div>
      <div style="margin-top:var(--space-3); display:flex; gap:var(--space-2);">
        <button class="btn btn--ghost" id="btn-tambah-lab">+ Minta Pemeriksaan Lab</button>
      </div>` : ''}
    </div>`;
}

/* -------- Bind events -------- */
export function bindLabEvents(isSelesai) {
  if (isSelesai) return;
  $('#btn-tambah-lab').onclick = tambahLab;
}

async function tambahLab() {
  const rm = state.currentRM.rekam_medis;
  const sel = $('#f-lab-id');
  const opt = sel.options[sel.selectedIndex];
  const labId = sel.value;
  const namaManual = $('#f-lab-nama').value.trim();
  const namaLab = (opt && labId) ? opt.dataset.nama : namaManual;
  const catatan = $('#f-lab-catatan').value.trim();

  if (!namaLab) { alert('Pilih atau isi nama lab.'); return; }

  try {
    await apiFetch('dokter/lab.php', {
      method: 'POST',
      body: JSON.stringify({ rekam_medis_id: rm.id, lab_id: labId || null, nama_lab: namaLab, catatan })
    });
    await saveRMFieldsSilently();  // ← TAMBAH INI
    await reloadRM();
  } catch (err) { alert(err.message); }
}

async function hapusLab(id) {
  if (!confirm('Hapus permintaan lab?')) return;
  try {
    await apiFetch('dokter/lab.php', { method: 'DELETE', body: JSON.stringify({ id }) });
    await saveRMFieldsSilently();  // ← TAMBAH INI
    await reloadRM();
  } catch (err) { alert(err.message); }
}
