import { state, apiFetch } from './config.js';
import { $, $$, esc, fmtDateTime } from '../global/utils.js';
import { reloadRM, saveRMFieldsSilently } from './rm-form.js';

// ... sama persis

/* -------- Render panel tindakan -------- */
export function renderTindakanPanel(tindakan, isSelesai) {
  return `
    <div class="panel">
      <h3>Tindakan Medis</h3>
      <p class="panel-sub">Tindakan yang dilakukan dokter.</p>
      <div id="tindakan-list">
        ${tindakan.length === 0
          ? '<div class="cell-muted" style="font-size:var(--text-sm);">Belum ada tindakan.</div>'
          : tindakan.map(t => `
              <div class="list-item">
                <div>
                  <div class="t-name">${esc(t.nama_tindakan)}</div>
                  ${t.keterangan ? `<div class="t-ket">${esc(t.keterangan)}</div>` : ''}
                  <div class="t-ket">${fmtDateTime(t.waktu)}</div>
                </div>
                ${!isSelesai ? `<button class="btn btn--danger btn--sm" data-del-tindakan="${t.id}">Hapus</button>` : ''}
              </div>`).join('')}
      </div>
      ${!isSelesai ? `
      <div class="form-grid cols-2" style="margin-top:var(--space-4);">
        <div class="form-field">
          <label>Nama Tindakan</label>
          <input id="f-tindakan-nama" placeholder="mis. Nebulisasi" />
        </div>
        <div class="form-field">
          <label>Keterangan</label>
          <input id="f-tindakan-ket" />
        </div>
        <div class="form-field">
          <label>Biaya (opsional)</label>
          <input type="number" step="0.01" id="f-tindakan-biaya" placeholder="0" />
        </div>
      </div>
      <div style="margin-top:var(--space-3);">
        <button class="btn btn--ghost" id="btn-tambah-tindakan">+ Tambah Tindakan</button>
      </div>` : ''}
    </div>`;
}

/* -------- Bind events -------- */
export function bindTindakanEvents(isSelesai) {
  if (isSelesai) return;
  $('#btn-tambah-tindakan').onclick = tambahTindakan;
  $$('[data-del-tindakan]').forEach(b => b.onclick = () =>
    hapusTindakan(Number(b.dataset.delTindakan)));
}

async function tambahTindakan() {
  const rm = state.currentRM.rekam_medis;
  const nama = $('#f-tindakan-nama').value.trim();
  const ket  = $('#f-tindakan-ket').value.trim();
  const biaya = parseFloat($('#f-tindakan-biaya').value || '0');
  if (!nama) { alert('Nama tindakan wajib.'); return; }
  try {
    await apiFetch('global/tindakan.php', {
      method: 'POST',
      body: JSON.stringify({
          tipe: 'medis',
          rekam_medis_id: rm.id,
          nama_tindakan: nama,
          keterangan: ket,
          biaya
      })
    });
    await saveRMFieldsSilently();  // ← TAMBAH INI
    await reloadRM();
  } catch (err) { alert(err.message); }
}

async function hapusTindakan(id) {
  if (!confirm('Hapus tindakan?')) return;
  try {
    await apiFetch('global/tindakan.php', { method: 'DELETE', body: JSON.stringify({
    tipe: 'medis',
    id
}) });
    await saveRMFieldsSilently();  // ← TAMBAH INI
    await reloadRM();
  } catch (err) { alert(err.message); }
}
