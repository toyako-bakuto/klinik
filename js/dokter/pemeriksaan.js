import { state, badge } from './config.js';
import { $, esc, age, fmtDate, fmtDateTime } from '../global/utils.js';
import { renderTindakanPanel, bindTindakanEvents } from './tindakan.js';
import { renderResepPanel,    bindResepEvents }    from './resep.js';
import { renderLabPanel,      bindLabEvents }      from './lab.js';
import { simpanRM } from './rm-form.js';

// ... sama persis

export function showPemeriksaan() {
  const { pendaftaran: p, pemeriksaan_awal: pa, rekam_medis: rm,
          tindakan, resep_item, lab, riwayat } = state.currentRM;
  const container = $('#pemeriksaan-container');
  const isSelesai = rm && rm.status === 'selesai';

  container.innerHTML = `
    <div class="two-col">
      <div>
        ${renderDataPasien(p, rm)}
        ${renderPemeriksaanAwal(pa)}
        ${renderPemeriksaanDokter(rm, isSelesai)}
        ${renderDiagnosis(rm, isSelesai)}
        ${renderTindakanPanel(tindakan, isSelesai)}
        ${renderResepPanel(resep_item, isSelesai)}
        ${renderLabPanel(lab, isSelesai)}
        ${renderActionBar(rm, isSelesai)}
      </div>
      <div>
        ${renderRiwayatPasien(riwayat)}
      </div>
    </div>
  `;

  if (!isSelesai) {
    $('#btn-simpan').onclick    = () => simpanRM(false);
    $('#btn-minta-lab').onclick = () => {
      if (confirm('Tandai pasien menunggu hasil lab?')) simpanRM('minta_lab');
    };
    $('#btn-selesai').onclick   = () => {
      if (confirm('Selesaikan pemeriksaan?')) simpanRM('selesai');
    };
    bindTindakanEvents(isSelesai);
    bindResepEvents(isSelesai);
    bindLabEvents(isSelesai);
  }
}

/* =========================================================
   PANEL: DATA PASIEN
   ========================================================= */
function renderDataPasien(p, rm) {
  return `
    <div class="panel">
      <div class="panel-title-row">
        <div>
          <h3>${esc(p.pasien_nama)} <span class="cell-muted" style="font-weight:400;">(${esc(p.no_rm)})</span></h3>
          <p class="panel-sub">
            ${p.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} · ${age(p.tanggal_lahir)} ·
            No. Reg ${esc(p.no_reg)} · Antrean ${esc(p.no_antrean || '—')}
          </p>
        </div>
        <div>${badge(rm ? rm.status : 'draft')} &nbsp; ${badge(p.status_pendaftaran)}</div>
      </div>
      <div class="info-grid">
        ${p.alergi ? `
        <div style="padding:var(--space-3) var(--space-4);border-radius:var(--radius-md);
                    background-color:#fdecee;color:#b00020;font-size:var(--text-sm);
                    margin-top:var(--space-3);">
          <strong>⚠ Alergi pasien:</strong> ${esc(p.alergi)}
        </div>` : ''}
        <div class="info-item"><span class="k">Telepon</span><span class="v">${esc(p.telepon || '—')}</span></div>
        <div class="info-item"><span class="k">Alamat</span><span class="v" style="font-weight:400;">${esc(p.alamat || '—')}</span></div>
      </div>
    </div>`;
}

/* =========================================================
   PANEL: PEMERIKSAAN AWAL (perawat)
   ========================================================= */
function renderPemeriksaanAwal(pa) {
  if (!pa) return '';
  return `
    <div class="panel">
      <h3>Tanda Vital & Pemeriksaan Awal (Perawat)</h3>
      <p class="panel-sub">Diinput oleh ${esc(pa.perawat_nama || '—')} pada ${fmtDateTime(pa.created_at)}</p>
      <div class="vital-grid">
        ${pa.suhu               ? `<div class="vital-chip"><div class="k">Suhu</div><div class="v">${pa.suhu}°C</div></div>` : ''}
        ${pa.sistolik && pa.diastolik ? `<div class="vital-chip"><div class="k">TD</div><div class="v">${pa.sistolik}/${pa.diastolik}</div></div>` : ''}
        ${pa.nadi               ? `<div class="vital-chip"><div class="k">Nadi</div><div class="v">${pa.nadi}</div></div>` : ''}
        ${pa.pernapasan         ? `<div class="vital-chip"><div class="k">RR</div><div class="v">${pa.pernapasan}</div></div>` : ''}
        ${pa.saturasi_oksigen   ? `<div class="vital-chip"><div class="k">SpO₂</div><div class="v">${pa.saturasi_oksigen}%</div></div>` : ''}
        ${pa.berat_badan        ? `<div class="vital-chip"><div class="k">BB</div><div class="v">${pa.berat_badan} kg</div></div>` : ''}
        ${pa.tinggi_badan       ? `<div class="vital-chip"><div class="k">TB</div><div class="v">${pa.tinggi_badan} cm</div></div>` : ''}
      </div>
      ${pa.keluhan   ? `<div style="margin-top:var(--space-4);"><strong>Keluhan (perawat):</strong><div class="cell-muted">${esc(pa.keluhan)}</div></div>` : ''}
      ${pa.anamnesis ? `<div style="margin-top:var(--space-3);"><strong>Anamnesis (perawat):</strong><div class="cell-muted">${esc(pa.anamnesis)}</div></div>` : ''}
    </div>`;
}

/* =========================================================
   PANEL: PEMERIKSAAN DOKTER (form)
   ========================================================= */
function renderPemeriksaanDokter(rm, isSelesai) {
  const d = isSelesai ? 'disabled' : '';
  return `
    <div class="panel">
      <h3>Pemeriksaan Dokter</h3>
      <p class="panel-sub">Keluhan, anamnesis, pemeriksaan fisik, dan catatan dokter.</p>
      <div class="form-grid">
        <div class="form-field">
          <label>Keluhan</label>
          <textarea id="f-keluhan" ${d}>${esc(rm?.keluhan || '')}</textarea>
        </div>
        <div class="form-field">
          <label>Anamnesis</label>
          <textarea id="f-anamnesis" ${d}>${esc(rm?.anamnesis || '')}</textarea>
        </div>
        <div class="form-field">
          <label>Pemeriksaan Fisik</label>
          <textarea id="f-fisik" ${d}>${esc(rm?.pemeriksaan_fisik || '')}</textarea>
        </div>
        <div class="form-field">
          <label>Catatan Dokter</label>
          <textarea id="f-catatan" ${d}>${esc(rm?.catatan || '')}</textarea>
        </div>
      </div>
    </div>`;
}

/* =========================================================
   PANEL: DIAGNOSIS
   ========================================================= */
function renderDiagnosis(rm, isSelesai) {
  const d = isSelesai ? 'disabled' : '';
  return `
    <div class="panel">
      <h3>Diagnosis</h3>
      <p class="panel-sub">Diagnosis utama wajib diisi sebelum menyelesaikan.</p>
      <div class="form-grid cols-2">
        <div class="form-field">
          <label>Diagnosis Utama *</label>
          <input id="f-dx-utama" value="${esc(rm?.diagnosis_utama || '')}" ${d} />
        </div>
        <div class="form-field">
          <label>Kode ICD-10 (opsional)</label>
          <input id="f-dx-kode" value="${esc(rm?.diagnosis_kode || '')}" ${d} />
        </div>
      </div>
      <div class="form-field" style="margin-top:var(--space-3);">
        <label>Diagnosis Sekunder</label>
        <textarea id="f-dx-sekunder" ${d}>${esc(rm?.diagnosis_sekunder || '')}</textarea>
      </div>
    </div>`;
}

/* =========================================================
   PANEL: ACTION BAR
   ========================================================= */
function renderActionBar(rm, isSelesai) {
  return `
    <div class="panel">
      <div class="action-bar">
        <span class="hint">
          ${isSelesai
            ? `Selesai pada ${fmtDateTime(rm.selesai_at)}.`
            : 'Simpan dulu, lalu selesaikan bila sudah yakin.'}
        </span>
        ${!isSelesai ? `
          <button class="btn btn--ghost" id="btn-simpan">Simpan</button>
          <button class="btn btn--ghost" id="btn-minta-lab">Minta Lab &amp; Tunda</button>
          <button class="btn btn--primary" id="btn-selesai">Selesaikan Pemeriksaan</button>
        ` : ''}
      </div>
    </div>`;
}

/* =========================================================
   PANEL: RIWAYAT PASIEN (sidebar kanan)
   ========================================================= */
function renderRiwayatPasien(riwayat) {
  return `
    <div class="panel">
      <h3>Riwayat Pasien</h3>
      <p class="panel-sub">Kunjungan sebelumnya pasien ini.</p>
      ${riwayat.length === 0
        ? '<div class="cell-muted" style="font-size:var(--text-sm);">Belum ada riwayat.</div>'
        : riwayat.map(r => `
            <div class="list-item">
              <div>
                <div class="t-name">${fmtDate(r.tanggal)} — ${esc(r.dokter_nama)}</div>
                <div class="t-ket">
                  ${r.diagnosis_utama
                    ? `Dx: ${esc(r.diagnosis_utama)}${r.diagnosis_kode ? ` (${esc(r.diagnosis_kode)})` : ''}`
                    : 'Belum ada diagnosis'}
                </div>
                <div class="t-ket">${badge(r.status)}</div>
              </div>
            </div>`).join('')}
    </div>`;
}
