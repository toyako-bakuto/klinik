import { state, apiFetch } from './config.js';
import { $, $$, esc } from '../global/utils.js';
import { reloadRM, saveRMFieldsSilently } from './rm-form.js';

// ... sama persis

/* -------- Render panel resep -------- */
export function renderResepPanel(resepItem, isSelesai) {
  return `
    <div class="panel">
      <h3>Resep Obat</h3>
      <p class="panel-sub">Obat yang diresepkan.</p>
      <div id="resep-list">
        ${resepItem.length === 0
          ? '<div class="cell-muted" style="font-size:var(--text-sm);">Belum ada obat.</div>'
          : resepItem.map(it => `
              <div class="list-item">
                <div>
                  <div class="t-name">${esc(it.nama_obat)}</div>
                  <div class="t-ket">${esc(it.dosis)} · ${esc(it.frekuensi)} · ${esc(it.durasi)}${it.instruksi ? ' · '+esc(it.instruksi) : ''}</div>
                </div>
                ${!isSelesai ? `<button class="btn btn--danger btn--sm" data-del-resep="${it.id}">Hapus</button>` : ''}
              </div>`).join('')}
      </div>
      ${!isSelesai ? `
      <div class="form-grid cols-2" style="margin-top:var(--space-4);">
        <div class="form-field">
          <label>Obat</label>
          <select id="f-obat-id">
            <option value="">— pilih obat —</option>
            ${state.masterObat.map(o => `<option value="${o.id}" data-nama="${esc(o.nama)}">${esc(o.nama)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Atau nama manual</label>
          <input id="f-obat-nama" placeholder="(opsional jika pilih dari daftar)" />
        </div>
      </div>
      <div class="form-grid cols-2" style="margin-top:var(--space-3);">
        <div class="form-field"><label>Dosis</label><input id="f-dosis" placeholder="mis. 500 mg" /></div>
        <div class="form-field"><label>Frekuensi</label><input id="f-frekuensi" placeholder="mis. 3x sehari" /></div>
        <div class="form-field"><label>Durasi</label><input id="f-durasi" placeholder="mis. 5 hari" /></div>
        <div class="form-field"><label>Instruksi</label><input id="f-instruksi" placeholder="mis. sesudah makan" /></div>
      </div>
      <div style="margin-top:var(--space-3);">
        <button class="btn btn--ghost" id="btn-tambah-resep">+ Tambah Obat</button>
      </div>` : ''}
    </div>`;
}

/* -------- Bind events -------- */
export function bindResepEvents(isSelesai) {
  if (isSelesai) return;
  $('#btn-tambah-resep').onclick = tambahResep;
  $$('[data-del-resep]').forEach(b => b.onclick = () =>
    hapusResep(Number(b.dataset.delResep)));
}

async function tambahResep() {
  const rm = state.currentRM.rekam_medis;
  const selectObat = $('#f-obat-id');
  const opt = selectObat.options[selectObat.selectedIndex];
  const obatId = selectObat.value;
  const namaManual = $('#f-obat-nama').value.trim();
  const namaObat = (opt && obatId) ? opt.dataset.nama : namaManual;

  const dosis     = $('#f-dosis').value.trim();
  const frekuensi = $('#f-frekuensi').value.trim();
  const durasi    = $('#f-durasi').value.trim();
  const instruksi = $('#f-instruksi').value.trim();

  if (!namaObat || !dosis || !frekuensi || !durasi) {
    alert('Obat, dosis, frekuensi, dan durasi wajib diisi.'); return;
  }

  try {
    await apiFetch('global/resep.php', {
      method: 'POST',
      body: JSON.stringify({
        rekam_medis_id: rm.id,
        obat_id: obatId || null,
        nama_obat: namaObat,
        dosis, frekuensi, durasi, instruksi
      })
    });
    await saveRMFieldsSilently();  // ← TAMBAH INI
    await reloadRM();
  } catch (err) { alert(err.message); }
}

async function hapusResep(id) {
  if (!confirm('Hapus obat dari resep?')) return;
  try {
    await apiFetch('global/resep.php', { method: 'DELETE', body: JSON.stringify({ id }) });
    await saveRMFieldsSilently();  // ← TAMBAH INI
    await reloadRM();
  } catch (err) { alert(err.message); }
}
