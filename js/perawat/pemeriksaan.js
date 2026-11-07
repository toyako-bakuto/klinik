import { state, apiFetch, badge } from './config.js';
import { $, $$, esc, fmtDate, fmtDateTime, age } from '../global/utils.js';

// ... sama persis termasuk savePAFieldsSilently & reloadPemeriksaan

/* =========================================================
   RENDER LENGKAP
   ========================================================= */
export function showPemeriksaan() {
  const { pendaftaran: p, pemeriksaan: pa, tindakan } = state.currentPA;
  const container = $('#pemeriksaan-container');
  const isReadOnly =
    pa?.status === 'selesai' ||
    p.status_pendaftaran === 'menunggu_dokter';

  container.innerHTML = `
    <div class="panel">
      <div class="panel-title-row">
        <div>
          <h3>${esc(p.pasien_nama)} <span class="cell-muted" style="font-weight:400;">(${esc(p.no_rm)})</span></h3>
          <p class="panel-sub">
            ${p.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} · ${age(p.tanggal_lahir)} ·
            No. Reg ${esc(p.no_reg)} · Antrian ${esc(p.no_antrian || '—')}
          </p>
        </div>
        <div>${badge(pa ? pa.status : 'draft')}</div>
      </div>

      <div class="info-grid">
        <div class="info-item"><span class="k">Dokter Tujuan</span><span class="v">${esc(p.dokter_nama)}</span></div>
        <div class="info-item"><span class="k">Spesialis</span><span class="v">${esc(p.spesialis)}</span></div>
        <div class="info-item"><span class="k">Tanggal</span><span class="v">${fmtDate(p.tanggal)}</span></div>
        <div class="info-item"><span class="k">Keluhan Awal (Pendaftaran)</span><span class="v" style="font-weight:400;">${esc(p.keluhan_daftar || '—')}</span></div>
      </div>
    </div>

    <div class="panel">
      <h3>Tanda Vital</h3>
      <p class="panel-sub">Isi hasil pengukuran tanda vital pasien.</p>
      <div class="vital-grid">
        ${vitalField('suhu', 'Suhu', pa?.suhu, '°C', 'number', '0.1', isReadOnly)}
        ${vitalField('sistolik', 'Sistolik', pa?.sistolik, 'mmHg', 'number', '1', isReadOnly)}
        ${vitalField('diastolik', 'Diastolik', pa?.diastolik, 'mmHg', 'number', '1', isReadOnly)}
        ${vitalField('nadi', 'Nadi', pa?.nadi, 'bpm', 'number', '1', isReadOnly)}
        ${vitalField('pernapasan', 'Pernapasan', pa?.pernapasan, 'x/mnt', 'number', '1', isReadOnly)}
        ${vitalField('saturasi_oksigen', 'Saturasi O₂', pa?.saturasi_oksigen, '%', 'number', '1', isReadOnly)}
        ${vitalField('berat_badan', 'Berat Badan', pa?.berat_badan, 'kg', 'number', '0.1', isReadOnly)}
        ${vitalField('tinggi_badan', 'Tinggi Badan', pa?.tinggi_badan, 'cm', 'number', '0.1', isReadOnly)}
      </div>
    </div>

    <div class="panel">
      <h3>Pemeriksaan Awal</h3>
      <p class="panel-sub">Catat keluhan dan informasi awal pasien.</p>
      <div class="form-grid">
        <div class="form-field">
          <label for="f-keluhan">Keluhan Utama</label>
          <textarea id="f-keluhan" ${isReadOnly ? 'disabled' : ''}>${esc(pa?.keluhan || '')}</textarea>
        </div>
        <div class="form-field">
          <label for="f-anamnesis">Anamnesis (riwayat penyakit / obat / alergi)</label>
          <textarea id="f-anamnesis" ${isReadOnly ? 'disabled' : ''}>${esc(pa?.anamnesis || '')}</textarea>
        </div>
        <div class="form-field">
          <label for="f-catatan">Catatan Perawat</label>
          <textarea id="f-catatan" ${isReadOnly ? 'disabled' : ''}>${esc(pa?.catatan || '')}</textarea>
        </div>
      </div>
    </div>

    <div class="panel">
      <h3>Tindakan Keperawatan</h3>
      <p class="panel-sub">Tindakan yang sudah dilakukan pada kunjungan ini.</p>
      <div class="tindakan-list" id="tindakan-list">
        ${tindakan.length === 0
          ? '<div class="cell-muted" style="font-size:var(--text-sm);">Belum ada tindakan.</div>'
          : tindakan.map(t => `
              <div class="tindakan-item">
                <div>
                  <div class="t-name">${esc(t.nama_tindakan)}</div>
                  ${t.keterangan ? `<div class="t-ket">${esc(t.keterangan)}</div>` : ''}
                  <div class="t-ket">${fmtDateTime(t.waktu)}</div>
                </div>
                ${!isReadOnly ? `<button class="btn btn--danger btn--sm" data-del-tindakan="${t.id}">Hapus</button>` : ''}
              </div>`).join('')}
      </div>

      ${!isReadOnly ? `
        <div class="form-grid cols-2" style="margin-top: var(--space-4);">
          <div class="form-field">
            <label for="f-tindakan-nama">Nama Tindakan</label>
            <input id="f-tindakan-nama" placeholder="mis. Cek gula darah" />
          </div>
          <div class="form-field">
            <label for="f-tindakan-ket">Keterangan (opsional)</label>
            <input id="f-tindakan-ket" />
          </div>
        </div>
        <div style="margin-top: var(--space-3);">
          <button class="btn btn--ghost" id="btn-tambah-tindakan">+ Tambah Tindakan</button>
        </div>
      ` : ''}
    </div>

    <div class="panel">
      <div class="action-bar">
        <span class="hint">
          ${isReadOnly
            ? `Pemeriksaan selesai pada ${fmtDateTime(pa.selesai_at)} oleh ${esc(pa.perawat_nama)}.`
            : 'Simpan dulu tanda vital & pemeriksaan awal sebelum menyelesaikan.'}
        </span>
        ${!isReadOnly ? `
          <button class="btn btn--ghost" id="btn-simpan">Simpan</button>
          <button class="btn btn--primary" id="btn-selesai">Selesai &amp; Teruskan ke Dokter</button>
        ` : ''}
      </div>
    </div>
  `;

  if (!isReadOnly) {
    $('#btn-simpan').onclick = () => simpanPemeriksaan(false);
    $('#btn-selesai').onclick = () => {
      if (!confirm('Selesaikan pemeriksaan dan teruskan ke dokter?')) return;
      simpanPemeriksaan(true);
    };
    $('#btn-tambah-tindakan').onclick = tambahTindakan;
    $$('[data-del-tindakan]').forEach(b => b.onclick = () =>
      hapusTindakan(Number(b.dataset.delTindakan)));
  }
}

/* =========================================================
   VITAL FIELDS
   ========================================================= */
function vitalField(name, label, val, unit, type, step, disabled) {
  return `
    <div class="vital-field">
      <label>${esc(label)}</label>
      <input type="${type}" step="${step}" name="${name}"
             value="${val ?? ''}" ${disabled ? 'disabled' : ''} />
      <span class="unit">${esc(unit)}</span>
    </div>`;
}

function collectVital() {
  const out = {};
  ['suhu','sistolik','diastolik','nadi','pernapasan','saturasi_oksigen','berat_badan','tinggi_badan']
    .forEach(k => {
      const el = document.querySelector(`[name="${k}"]`);
      if (el && el.value !== '') out[k] = el.value;
    });
  out.keluhan   = $('#f-keluhan')?.value.trim()   || '';
  out.anamnesis = $('#f-anamnesis')?.value.trim() || '';
  out.catatan   = $('#f-catatan')?.value.trim()   || '';
  return out;
}

/* =========================================================
   AUTO-SAVE DIAM-DIAM
   Simpan field vital + keluhan + anamnesis + catatan
   tanpa finalize. Dipanggil sebelum reload supaya input
   user tidak hilang saat menambah/hapus tindakan.
   ========================================================= */
async function savePAFieldsSilently() {
  const pa = state.currentPA?.pemeriksaan;
  if (!pa) return;

  if (pa.status === 'selesai') return;

  const fields = collectVital();
  // skip kalau semua kosong
  const hasContent = Object.values(fields).some(v => v !== '');
  if (!hasContent) return;

  try {
    await apiFetch('perawat/pemeriksaan.php', {
      method: 'PUT',
      body: JSON.stringify({ id: pa.id, ...fields })
    });
  } catch (err) {
    console.warn('Auto-save PA fields gagal:', err.message);
  }
}

/* =========================================================
   RELOAD HELPER
   ========================================================= */
async function reloadPemeriksaan() {
  const pa = state.currentPA?.pemeriksaan;
  if (!pa) return;
  const data = await apiFetch('perawat/pemeriksaan.php?pendaftaran_id=' + pa.pendaftaran_id);
  state.currentPA = data;
  showPemeriksaan();
}

/* =========================================================
   SIMPAN / FINALIZE
   ========================================================= */
async function simpanPemeriksaan(finalize) {
  const { pemeriksaan: pa } = state.currentPA;
  if (!pa) return;

  const btn = finalize ? $('#btn-selesai') : $('#btn-simpan');
  const oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Menyimpan…';

  try {
    const payload = { id: pa.id, ...collectVital() };
    if (finalize) payload.action = 'selesai';

    await apiFetch('perawat/pemeriksaan.php', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (finalize) {
      alert('Pemeriksaan selesai. Pasien diteruskan ke dokter.');
      const btnAntrean = document.querySelector('.sidebar [data-target="antrean"]');
      if (btnAntrean) btnAntrean.click();
      // refresh antrean
      import('./antrean.js').then(m => m.loadAntrean()).catch(() => {});
    } else {
      await reloadPemeriksaan();
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

/* =========================================================
   TINDAKAN CRUD
   ========================================================= */
async function tambahTindakan() {
  const { pemeriksaan: pa } = state.currentPA;
  if (!pa) return;

  const nama = $('#f-tindakan-nama').value.trim();
  const ket = $('#f-tindakan-ket').value.trim();

  if (!nama) {
    alert('Nama tindakan wajib diisi.');
    return;
  }

  try {
    await apiFetch('global/tindakan.php', {
      method: 'POST',
      body: JSON.stringify({
        tipe: 'keperawatan',
        pemeriksaan_awal_id: pa.id,
        nama_tindakan: nama,
        keterangan: ket
      })
    });

    await savePAFieldsSilently();
    await reloadPemeriksaan();

  } catch (err) {
    console.error('Gagal menambahkan tindakan:', err);
    alert(err.message);
  }
}

async function hapusTindakan(id) {
  if (!confirm('Hapus tindakan ini?')) return;

  const { pemeriksaan: pa } = state.currentPA;
  if (!pa) return;

  try {
    await apiFetch('global/tindakan.php', {
      method: 'DELETE',
      body: JSON.stringify({
        tipe: 'keperawatan',
        id
      })
    });

    await savePAFieldsSilently();
    await reloadPemeriksaan();

  } catch (err) {
    alert(err.message);
  }
}