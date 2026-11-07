import { state, apiFetch, tagihanBadge } from './config.js';
import { $, $$, esc, fmtDate, fmtDateTime, fmtRupiah } from '../global/utils.js';

const searchInput  = $('#pembayaran-search');
const searchResult = $('#pembayaran-search-result');
const container    = $('#pembayaran-container');

const PEMBAYARAN_DEFAULT_HTML = `
  <div class="empty-state">
    Ketik nama pasien (min. 2 huruf) di kotak pencarian di atas.
  </div>`;

export function initPembayaranEvents() {
  if (!searchInput) return;

  let timer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    const q = searchInput.value.trim();

    if (q.length < 2) {
      searchResult.innerHTML = '';
      container.innerHTML = PEMBAYARAN_DEFAULT_HTML;
      return;
    }

    timer = setTimeout(() => doSearch(q), 350);
  });
}

async function doSearch(q) {
  searchResult.innerHTML = '<div class="loading">Mencari…</div>';
  try {
    const { data } = await apiFetch('kasir/tagihan.php?action=cari&q=' + encodeURIComponent(q));

    if (data.length === 0) {
      searchResult.innerHTML = `
        <div class="panel">
          <p class="cell-muted" style="margin:0;font-size:var(--text-sm);">
            Tidak ada pasien ditemukan untuk "<strong>${esc(q)}</strong>".
          </p>
        </div>`;
      return;
    }

    searchResult.innerHTML = `
      <div class="panel">
        <h3>Hasil Pencarian (${data.length})</h3>
        <p class="panel-sub">Klik salah satu untuk membuka tagihan.</p>
        <div class="table-wrapper"><table>
          <thead><tr>
            <th>Tanggal</th><th>No. Reg</th><th>Pasien</th><th>Dokter</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${data.map(p => `
              <tr>
                <td class="cell-muted">${fmtDate(p.tanggal)}</td>
                <td class="cell-muted">${esc(p.no_reg)}</td>
                <td class="cell-name">${esc(p.pasien_nama)} <span class="cell-muted">(${esc(p.no_rm)})</span></td>
                <td>${esc(p.dokter_nama)} <span class="cell-muted">· ${esc(p.spesialis)}</span></td>
                <td>${p.status_tagihan
                  ? tagihanBadge(p.status_tagihan)
                  : '<span class="badge badge--waiting">Belum ditagih</span>'}</td>
                <td>
                  <button class="btn btn--primary btn--sm"
                          data-pilih-pendaftaran="${p.pendaftaran_id}">
                    ${p.status_tagihan ? 'Buka Tagihan' : 'Hitung & Buat'}
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;

    searchResult.querySelectorAll('[data-pilih-pendaftaran]').forEach(b => {
      b.onclick = () => {
        const pid = Number(b.dataset.pilihPendaftaran);
        searchInput.value = '';
        searchResult.innerHTML = '';
        openPembayaranByPendaftaran(pid);
      };
    });
  } catch (err) {
    searchResult.innerHTML = `
      <div class="panel">
        <p class="cell-muted" style="margin:0;font-size:var(--text-sm);">${esc(err.message)}</p>
      </div>`;
  }
}

function switchToPembayaranSection() {
  $$('.content-section').forEach(s => {
    s.hidden = s.id !== 'section-pembayaran';
  });
  $$('.sidebar [data-target]').forEach(b => {
    const on = b.dataset.target === 'pembayaran';
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $('#page-title').textContent        = 'Pembayaran';
  $('#breadcrumb-active').textContent = 'Pembayaran';
  if (history.replaceState) history.replaceState(null, '', '#pembayaran');
}

export async function openPembayaranByPendaftaran(pendaftaranId) {
  switchToPembayaranSection();
  container.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const data = await apiFetch('kasir/tagihan.php?pendaftaran_id=' + pendaftaranId);
    state.currentTagihan = data;
    renderPembayaran(data);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export async function openPembayaran(tagihanId) {
  container.innerHTML = '<div class="loading">Memuat…</div>';
  try {
    const k = await apiFetch('kasir/kuitansi.php?tagihan_id=' + tagihanId);
    await openPembayaranByPendaftaran(k.tagihan.pendaftaran_id);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

function renderPembayaran(data) {
  const { pendaftaran: p, tagihan: t, items, pembayaran, live_items } = data;
  const isSnapshot = !!t;
  const itemsToShow = isSnapshot ? items : (live_items || []);
  const totalLive = itemsToShow.reduce((s, it) => s + parseFloat(it.subtotal || 0), 0);
  const total = isSnapshot ? parseFloat(t.total) : totalLive;
  const totalBayar = isSnapshot ? parseFloat(t.total_bayar) : 0;
  const sisa = total - totalBayar;

  container.innerHTML = `
    <div class="panel">
      <div class="panel-title-row">
        <div>
          <h3>${esc(p.pasien_nama)} <span class="cell-muted" style="font-weight:400;">(${esc(p.no_rm)})</span></h3>
          <p class="panel-sub">No. Reg ${esc(p.no_reg)} · ${fmtDate(p.tanggal)} · Dokter ${esc(p.dokter_nama)} (${esc(p.spesialis)})</p>
        </div>
        <div>${isSnapshot ? tagihanBadge(t.status) : '<span class="badge badge--waiting">Belum dibuat</span>'}</div>
      </div>
    </div>

    <div class="panel">
      <h3>Rincian Tagihan</h3>
      <p class="panel-sub">${isSnapshot ? 'Snapshot saat tagihan dibuat.' : 'Dihitung live dari sumber.'}</p>
      ${itemsToShow.length === 0
        ? '<div class="cell-muted" style="font-size:var(--text-sm);">Tidak ada item.</div>'
        : `
          <div class="table-wrapper"><table>
            <thead><tr>
              <th>Tipe</th><th>Nama</th>
              <th class="cell-right">Qty</th>
              <th class="cell-right">Harga</th>
              <th class="cell-right">Subtotal</th>
            </tr></thead>
            <tbody>
              ${itemsToShow.map(it => `
                <tr>
                  <td class="cell-muted">${esc(it.tipe)}</td>
                  <td>${esc(it.nama)}</td>
                  <td class="cell-right">${it.qty}</td>
                  <td class="cell-right">${fmtRupiah(it.harga_satuan)}</td>
                  <td class="cell-right">${fmtRupiah(it.subtotal)}</td>
                </tr>`).join('')}
            </tbody>
          </table></div>`}
      <div class="total-box">
        <div class="total-row"><span>Total</span><span class="val">${fmtRupiah(total)}</span></div>
        <div class="total-row"><span>Dibayar</span><span class="val">${fmtRupiah(totalBayar)}</span></div>
        <div class="total-row grand"><span>Sisa</span><span class="val">${fmtRupiah(sisa)}</span></div>
      </div>
    </div>

    ${isSnapshot && pembayaran.length > 0 ? `
      <div class="panel">
        <h3>Riwayat Pembayaran</h3>
        ${pembayaran.map(pb => `
          <div class="total-row" style="border-bottom:1px solid var(--color-border); padding:var(--space-2) 0;">
            <span>
              ${fmtDateTime(pb.created_at)} · ${esc(pb.metode)}
              ${pb.void == 1 ? '<span class="badge badge--danger" style="margin-left:6px;">VOID</span>' : ''}
              <br><small class="cell-muted">${esc(pb.kasir_nama || '—')}${pb.catatan ? ' · ' + esc(pb.catatan) : ''}</small>
            </span>
            <span class="val">
              ${fmtRupiah(pb.nominal)}
              ${pb.void == 0 ? `<br><button class="btn btn--danger btn--sm" data-void="${pb.id}">Void</button>` : ''}
            </span>
          </div>`).join('')}
      </div>` : ''}

    <div class="panel">
      <div class="action-bar">
        <span class="hint">${isSnapshot
          ? (sisa <= 0 ? 'Tagihan lunas.' : 'Masukkan pembayaran.')
          : 'Klik "Buat Tagihan" untuk snapshot.'}</span>
        ${!isSnapshot
          ? `<button class="btn btn--primary" id="btn-buat-tagihan" data-pendaftaran="${p.id}">Buat Tagihan</button>`
          : ''}
      </div>
    </div>

    ${isSnapshot && sisa > 0 ? `
      <div class="panel">
        <h3>Input Pembayaran</h3>
        <div class="form-grid cols-2">
          <div class="form-field">
            <label>Metode *</label>
            <select id="f-metode">
              <option value="tunai">Tunai</option>
              <option value="debit">Debit</option>
              <option value="qris">QRIS</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div class="form-field">
            <label>Nominal *</label>
            <input type="number" step="0.01" id="f-nominal" value="${sisa.toFixed(2)}" />
          </div>
          <div class="form-field" style="grid-column:1/-1;">
            <label>Catatan</label>
            <input id="f-catatan" />
          </div>
        </div>
        <div class="action-bar">
          <span class="hint">Nominal maks: ${fmtRupiah(sisa)}</span>
          <button class="btn btn--primary" id="btn-bayar">Bayar</button>
        </div>
      </div>` : ''}
  `;

  bindPembayaranEvents(isSnapshot, sisa);
}

function bindPembayaranEvents(isSnapshot, sisa) {
  if (!isSnapshot) {
    const btnBuat = $('#btn-buat-tagihan');
    if (btnBuat) {
      btnBuat.onclick = async () => {
        const pid = parseInt(btnBuat.dataset.pendaftaran, 10);
        try {
          const res = await apiFetch('kasir/tagihan.php', {
            method: 'POST',
            body: JSON.stringify({ pendaftaran_id: pid })
          });
          alert(`Tagihan dibuat: ${res.no_tagihan}`);
          openPembayaranByPendaftaran(pid);
        } catch (err) { alert(err.message); }
      };
    }
    return;
  }

  if (sisa > 0) {
    const btnBayar = $('#btn-bayar');
    if (btnBayar) btnBayar.onclick = () => bayar(state.currentTagihan.tagihan.id);
  }

  $$('[data-void]').forEach(b => b.onclick = () =>
    voidPembayaran(Number(b.dataset.void)));
}

async function bayar(tagihanId) {
  const metode  = $('#f-metode').value;
  const nominal = parseFloat($('#f-nominal').value);
  const catatan = $('#f-catatan').value.trim();
  if (!nominal || nominal <= 0) { alert('Nominal tidak valid.'); return; }

  try {
    await apiFetch('kasir/pembayaran.php', {
      method: 'POST',
      body: JSON.stringify({ tagihan_id: tagihanId, metode, nominal, catatan })
    });
    alert('Pembayaran berhasil.');
    const p = state.currentTagihan.pendaftaran;
    openPembayaranByPendaftaran(p.id);
  } catch (err) { alert(err.message); }
}

async function voidPembayaran(id) {
  const alasan = prompt('Alasan void:');
  if (!alasan) return;
  try {
    await apiFetch('kasir/pembayaran.php', {
      method: 'PUT',
      body: JSON.stringify({ id, action: 'void', alasan })
    });
    alert('Pembayaran di-void.');
    const p = state.currentTagihan.pendaftaran;
    openPembayaranByPendaftaran(p.id);
  } catch (err) { alert(err.message); }
}

export function registerPembayaranHooks() {
  window.__kasirHooks = window.__kasirHooks || {};
  window.__kasirHooks.openPembayaran = openPembayaran;
}
