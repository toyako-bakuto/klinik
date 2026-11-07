import { state, apiFetch, badge } from './config.js';
import { $, esc, fmtDateTime } from '../global/utils.js';

// ... sama persis

export async function bukaHasil(id) {
  const btn = document.querySelector('.sidebar [data-target="hasil"]');
  if (btn) btn.click();
  const container = $('#hasil-container');
  container.innerHTML = '<div class="loading">Memuat…</div>';

  try {
    const { data: r } = await apiFetch('lab/permintaan.php?id=' + id);
    state.current = r;

    container.innerHTML = `
      <div class="panel">
        <div class="panel-title-row">
          <div>
            <h3>${esc(r.pasien_nama)} <span class="cell-muted" style="font-weight:400;">(${esc(r.no_rm)})</span></h3>
            <p class="panel-sub">${esc(r.nama_lab)} · Dokter ${esc(r.dokter_nama)}</p>
          </div>
          <div>${badge(r.status)}</div>
        </div>
        <div class="info-grid">
          <div class="info-item"><span class="k">Jenis Sampel</span><span class="v">${esc(r.jenis_sampel || '—')}</span></div>
          <div class="info-item"><span class="k">Diambil</span><span class="v">${fmtDateTime(r.sampel_diambil_at)}</span></div>
          <div class="info-item"><span class="k">Oleh</span><span class="v">${esc(r.sampel_oleh || '—')}</span></div>
        </div>
      </div>

      <div class="panel">
        <h3>Input Hasil Pemeriksaan</h3>
        <p class="panel-sub">Isi hasil pengujian. Setelah disimpan, hasil menunggu validasi.</p>
        <div class="form-grid">
          <div class="form-field">
            <label>Hasil *</label>
            <textarea id="f-hasil" rows="6" placeholder="mis. Hb 13.5 g/dL, Leukosit 8000/µL, Trombosit 250000/µL">${esc(r.hasil || '')}</textarea>
          </div>
          <div class="form-field">
            <label>Nilai Rujukan</label>
            <textarea id="f-nilai-rujukan" rows="2" placeholder="mis. Hb: 12–16 g/dL, Leukosit: 4000–10000/µL">${esc(r.nilai_rujukan || '')}</textarea>
          </div>
          <div class="form-field">
            <label>Kesan</label>
            <textarea id="f-kesan" rows="2" placeholder="mis. Dalam batas normal">${esc(r.kesan || '')}</textarea>
          </div>
        </div>
        <div class="action-bar">
          <span class="hint">Hasil harus divalidasi sebelum masuk ke dokter.</span>
          <button class="btn btn--primary" id="btn-simpan-hasil">Simpan Hasil</button>
        </div>
      </div>
    `;

    $('#btn-simpan-hasil').onclick = async () => {
      const hasil   = $('#f-hasil').value.trim();
      const rujukan = $('#f-nilai-rujukan').value.trim();
      const kesan   = $('#f-kesan').value.trim();
      if (!hasil) { alert('Hasil wajib diisi.'); return; }
      try {
        await apiFetch('lab/hasil.php', {
          method: 'POST',
          body: JSON.stringify({ id, hasil, nilai_rujukan: rujukan, kesan })
        });
        alert('Hasil disimpan. Menunggu validasi.');
        const b = document.querySelector('.sidebar [data-target="validasi"]');
        if (b) b.click();
      } catch (err) { alert(err.message); }
    };
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}
