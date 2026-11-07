import { state, apiFetch, badge } from './config.js';
import { $, $$, esc, fmtDateTime } from '../global/utils.js';

// ... sama persis

export async function loadValidasi() {
  const el = $('#validasi-container');
  el.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const { data } = await apiFetch('lab/permintaan.php?status=hasil_diinput');
    if (data.length === 0) {
      el.innerHTML = '<div class="empty-state">Tidak ada hasil yang menunggu validasi.</div>';
      return;
    }
    el.innerHTML = `
      <div class="table-wrapper"><table>
        <thead><tr>
          <th>Waktu Input</th><th>Pasien</th><th>Jenis Lab</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${data.map(r => `
            <tr>
              <td class="cell-muted">${fmtDateTime(r.hasil_diinput_at)}</td>
              <td class="cell-name">${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
              <td>${esc(r.nama_lab)}</td>
              <td>${badge(r.status)}</td>
              <td><button class="btn btn--primary btn--sm" data-validasi="${r.id}">Buka & Validasi</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;
    $$('[data-validasi]').forEach(b => b.onclick = () => bukaValidasi(Number(b.dataset.validasi)));
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export async function bukaValidasi(id) {
  const btn = document.querySelector('.sidebar [data-target="validasi"]');
  if (btn) btn.click();
  const container = $('#validasi-container');
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
      </div>

      <div class="panel">
        <h3>Hasil</h3>
        <div class="preview-box">${esc(r.hasil || '—')}</div>
        ${r.nilai_rujukan ? `<p style="margin-top:var(--space-3);"><strong>Nilai Rujukan:</strong></p><div class="preview-box">${esc(r.nilai_rujukan)}</div>` : ''}
        ${r.kesan ? `<p style="margin-top:var(--space-3);"><strong>Kesan:</strong> ${esc(r.kesan)}</p>` : ''}
        <p style="margin-top:var(--space-3);" class="cell-muted">
          Diinput oleh ${esc(r.input_oleh || '—')} pada ${fmtDateTime(r.hasil_diinput_at)}
        </p>
      </div>

      <div class="panel">
        <div class="action-bar">
          <span class="hint">Setelah divalidasi, hasil masuk ke rekam medis dokter dan tagihan.</span>
          <button class="btn btn--primary" id="btn-validasi">✓ Validasi Hasil</button>
        </div>
      </div>
    `;

    $('#btn-validasi').onclick = async () => {
      if (!confirm('Validasi hasil ini?')) return;
      try {
        await apiFetch('lab/hasil.php', {
          method: 'PUT',
          body: JSON.stringify({ id, action: 'validasi' })
        });
        alert('Hasil divalidasi.');
        loadValidasi();
      } catch (err) { alert(err.message); }
    };
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}
