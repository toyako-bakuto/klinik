import { state, apiFetch, badge, JENIS_SAMPEL } from './config.js';
import { $, esc, fmtDateTime, age } from '../global/utils.js';
import { loadPermintaan } from './permintaan.js';

// ... sama persis

/* =========================================================
   BUKA FORM SAMPEL
   ========================================================= */
export async function bukaSampel(id) {
  const btn = document.querySelector('.sidebar [data-target="sampel"]');
  if (btn) btn.click();
  const container = $('#sampel-container');
  container.innerHTML = '<div class="loading">Memuat…</div>';

  try {
    const { data: r } = await apiFetch('lab/permintaan.php?id=' + id);
    state.current = r;

    container.innerHTML = `
      <div class="panel">
        <div class="panel-title-row">
          <div>
            <h3>${esc(r.pasien_nama)} <span class="cell-muted" style="font-weight:400;">(${esc(r.no_rm)})</span></h3>
            <p class="panel-sub">${r.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} · ${age(r.tanggal_lahir)} ·
               ${esc(r.nama_lab)} · Dokter ${esc(r.dokter_nama)}</p>
          </div>
          <div>${badge(r.status)}</div>
        </div>
        <div class="info-grid">
          <div class="info-item"><span class="k">Waktu Diminta</span><span class="v">${fmtDateTime(r.waktu_diminta)}</span></div>
          <div class="info-item"><span class="k">Catatan Dokter</span><span class="v" style="font-weight:400;">${esc(r.catatan || '—')}</span></div>
        </div>
      </div>

      <div class="panel">
        <h3>Ambil Sampel</h3>
        <p class="panel-sub">Catat jenis sampel yang diambil.</p>
        <div class="form-grid cols-2">
          <div class="form-field">
            <label>Jenis Sampel *</label>
            <select id="f-jenis-sampel">
              ${JENIS_SAMPEL.map(j => `<option value="${j}" ${r.jenis_sampel===j?'selected':''}>${j.charAt(0).toUpperCase()+j.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="form-field" style="grid-column:1/-1;">
            <label>Catatan Sampel</label>
            <textarea id="f-catatan-sampel" placeholder="Kondisi sampel, volume, dll."></textarea>
          </div>
        </div>
        <div class="action-bar">
          <span class="hint">Pastikan sampel sudah diambil sebelum klik simpan.</span>
          <button class="btn btn--primary" id="btn-simpan-sampel">Simpan</button>
        </div>
      </div>
    `;

    $('#btn-simpan-sampel').onclick = async () => {
      const jenis   = $('#f-jenis-sampel').value;
      const catatan = $('#f-catatan-sampel').value.trim();
      try {
        await apiFetch('lab/sampel.php', {
          method: 'POST',
          body: JSON.stringify({ id, jenis_sampel: jenis, catatan_sampel: catatan })
        });
        alert('Sampel dicatat.');
        const b = document.querySelector('.sidebar [data-target="permintaan"]');
        if (b) b.click();
      } catch (err) { alert(err.message); }
    };
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

/* =========================================================
   AKSI SAMPEL (proses, tolak)
   ========================================================= */
export async function aksiSampel(id, action, extra = {}) {
  try {
    await apiFetch('lab/sampel.php', {
      method: 'POST',
      body: JSON.stringify({ id, action, ...extra })
    });
    loadPermintaan();
  } catch (err) { alert(err.message); }
}

export async function tolakPermintaan(id) {
  const alasan = prompt('Alasan penolakan:');
  if (!alasan) return;
  aksiSampel(id, 'tolak', { alasan });
}
