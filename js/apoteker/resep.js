import { state, apiFetch, resepBadge } from './config.js';
import { $, $$, esc, fmtDate, fmtDateTime } from '../global/utils.js';

// ... sama persis

/* =========================================================
   SECTION LOADERS
   ========================================================= */
export async function loadMasuk() {
  return loadResepByStatus('masuk', '#masuk-table', 'masuk');
}

export async function loadVerifikasi() {
  return loadResepByStatus('masuk', '#verifikasi-container', 'verifikasi');
}

export async function loadPenyiapan() {
  return loadResepByStatus('diverifikasi', '#penyiapan-container', 'penyiapan');
}

export async function loadPenyerahan() {
  return loadResepByStatus('disiapkan', '#penyerahan-container', 'penyerahan');
}

async function loadResepByStatus(status, containerSel, mode) {
  const el = $(containerSel);
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const { data } = await apiFetch('global/resep.php?status=' + status);
    if (data.length === 0) {
      el.innerHTML = `<div class="empty-state">Tidak ada resep berstatus "${status}".</div>`;
      return;
    }
    el.innerHTML = renderResepList(data, mode);
    $$('[data-buka]', el).forEach(b => b.onclick = () =>
      bukaResep(Number(b.dataset.buka), mode));
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

function renderResepList(data, mode) {
  const actionLabel = mode === 'verifikasi' ? 'Verifikasi'
                    : mode === 'penyiapan'  ? 'Buka'
                    : mode === 'penyerahan' ? 'Serahkan'
                    : 'Buka';
  return `
    <div class="table-wrapper"><table>
      <thead><tr>
        <th>Tanggal</th><th>Pasien</th><th>Dokter</th><th>Jml Obat</th><th>Status</th><th></th>
      </tr></thead>
      <tbody>
        ${data.map(r => `
          <tr>
            <td class="cell-muted">${fmtDate(r.tanggal)}</td>
            <td class="cell-name">${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
            <td>${esc(r.dokter_nama)}</td>
            <td>${r.jml_item} obat</td>
            <td>${resepBadge(r.status)}</td>
            <td><button class="btn btn--primary btn--sm" data-buka="${r.id}">${actionLabel}</button></td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;
}

/* =========================================================
   DETAIL RESEP
   ========================================================= */
export async function bukaResep(id, mode) {
  // Pindah ke section sesuai mode
  const sectionMap = { verifikasi: 'verifikasi', penyiapan: 'penyiapan', penyerahan: 'penyerahan', masuk: 'verifikasi' };
  const btn = document.querySelector(`.sidebar [data-target="${sectionMap[mode] || 'verifikasi'}"]`);
  if (btn) btn.click();

  const containerMap = {
    verifikasi: '#verifikasi-container',
    penyiapan:  '#penyiapan-container',
    penyerahan: '#penyerahan-container',
  };
  const container = $(containerMap[mode]);
  if (!container) return;
  container.innerHTML = '<div class="loading">Memuat…</div>';

  try {
    const { resep: r, items } = await apiFetch('global/resep.php?id=' + id);
    state.currentResep = { resep: r, items };
    renderResepDetail(mode);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

function renderResepDetail(mode) {
  const { resep: r, items } = state.currentResep;
  const map = {
    verifikasi: '#verifikasi-container',
    penyiapan:  '#penyiapan-container',
    penyerahan: '#penyerahan-container',
  };
  const container = $(map[mode]);

  const isVerif = mode === 'verifikasi';
  const isSiap  = mode === 'penyiapan';
  const isSerah = mode === 'penyerahan';
  const alergi  = r.alergi
    ? `<div class="alert alert--danger"><strong>⚠ Alergi pasien:</strong> ${esc(r.alergi)}</div>`
    : '';

  container.innerHTML = `
    <div class="panel">
      <div class="panel-title-row">
        <div>
          <h3>Resep #${r.id} <span class="cell-muted" style="font-weight:400;">(${esc(r.no_reg)})</span></h3>
          <p class="panel-sub">
            ${esc(r.pasien_nama)} (${esc(r.no_rm)}) · ${fmtDate(r.tanggal)} ·
            Dokter: ${esc(r.dokter_nama)} · ${esc(r.spesialis)}
          </p>
        </div>
        <div>${resepBadge(r.status)}</div>
      </div>
      ${alergi}
      <div class="info-grid">
        <div class="info-item"><span class="k">Dibuat</span><span class="v">${fmtDateTime(r.created_at)}</span></div>
        ${r.verified_nama ? `<div class="info-item"><span class="k">Diverifikasi oleh</span><span class="v">${esc(r.verified_nama)} (${fmtDateTime(r.verified_at)})</span></div>` : ''}
        ${r.catatan_verifikasi ? `<div class="info-item"><span class="k">Catatan Verifikasi</span><span class="v" style="font-weight:400;">${esc(r.catatan_verifikasi)}</span></div>` : ''}
      </div>
    </div>

    <div class="panel">
      <h3>Daftar Obat</h3>
      <p class="panel-sub">${items.length} item dalam resep.</p>
      ${items.map(it => `
        <div class="list-item">
          <div>
            <div class="t-name">${esc(it.nama_obat)}</div>
            <div class="t-ket">${esc(it.dosis)} · ${esc(it.frekuensi)} · ${esc(it.durasi)}${it.instruksi ? ' · ' + esc(it.instruksi) : ''}</div>
            ${it.obat_id && it.stok_tersedia !== null
              ? `<div class="t-ket">Stok tersedia: <strong>${it.stok_tersedia} ${esc(it.satuan || '')}</strong></div>`
              : `<div class="t-ket">⚠ Obat tidak terhubung ke master (stok tidak dicek otomatis)</div>`}
          </div>
        </div>`).join('')}
    </div>

    ${isVerif ? `
      <div class="panel">
        <h3>Verifikasi Resep</h3>
        <p class="panel-sub">Periksa kesesuaian dosis, alergi, dan keamanan resep.</p>
        <div class="form-grid">
          <div class="form-field">
            <label>Catatan Verifikasi (opsional)</label>
            <textarea id="f-catatan-verifikasi"></textarea>
          </div>
        </div>
        <div class="action-bar">
          <span class="hint">Verifikasi jika resep sudah sesuai.</span>
          <button class="btn btn--danger" id="btn-tolak">Tolak</button>
          <button class="btn btn--primary" id="btn-verifikasi">Verifikasi</button>
        </div>
      </div>` : ''}

    ${isSiap ? `
      <div class="panel">
        <div class="action-bar">
          <span class="hint">Klik setelah obat selesai disiapkan.</span>
          <button class="btn btn--primary" id="btn-siapkan">Tandai Siap</button>
        </div>
      </div>` : ''}

    ${isSerah ? `
      <div class="panel">
        <h3>Penyerahan & Edukasi</h3>
        <p class="panel-sub">Isi edukasi obat (cara minum, waktu, efek samping).</p>
        <div class="form-grid">
          <div class="form-field">
            <label>Edukasi Obat *</label>
            <textarea id="f-edukasi" placeholder="mis. Minum setelah makan, habiskan, hindari alkohol."></textarea>
          </div>
        </div>
        <div class="action-bar">
          <span class="hint">Stok obat akan otomatis dikurangi.</span>
          <button class="btn btn--primary" id="btn-serahkan">Serahkan Obat</button>
        </div>
      </div>` : ''}
  `;

  bindAksiEvents(mode);
}

function bindAksiEvents(mode) {
  if (mode === 'verifikasi') {
    $('#btn-verifikasi').onclick = () => aksiResep('verifikasi', {
      catatan_verifikasi: $('#f-catatan-verifikasi').value.trim()
    });
    $('#btn-tolak').onclick = () => {
      const catatan = $('#f-catatan-verifikasi').value.trim();
      if (!catatan) { alert('Alasan penolakan wajib diisi di catatan verifikasi.'); return; }
      if (!confirm('Tolak resep ini?')) return;
      aksiResep('tolak', { catatan_verifikasi: catatan });
    };
  }
  if (mode === 'penyiapan') {
    $('#btn-siapkan').onclick = () => aksiResep('siapkan');
  }
  if (mode === 'penyerahan') {
    $('#btn-serahkan').onclick = () => {
      const edukasi = $('#f-edukasi').value.trim();
      if (!edukasi) { alert('Edukasi obat wajib diisi.'); return; }
      if (!confirm('Serahkan obat? Stok akan dikurangi.')) return;
      aksiResep('serahkan', { edukasi });
    };
  }
}

async function aksiResep(action, extra = {}) {
  const r = state.currentResep.resep;
  try {
    await apiFetch('global/resep.php', {
      method: 'PUT',
      body: JSON.stringify({ id: r.id, action, ...extra })
    });
    alert('Berhasil.');
    const active = document.querySelector('.sidebar [data-target].active')?.dataset.target;
    if (active === 'verifikasi') loadVerifikasi();
    if (active === 'penyiapan')  loadPenyiapan();
    if (active === 'penyerahan') loadPenyerahan();
    if (active === 'dashboard')  import('./dashboard.js').then(m => m.loadDashboard());
  } catch (err) {
    alert(err.message);
  }
}

/* ========== Refresh button ========== */
export function initResepEvents() {
  $('#btn-refresh-masuk')?.addEventListener('click', loadMasuk);
}
