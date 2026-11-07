import { apiFetch, badge, STATUS_LABEL } from './config.js';
import { $, $$, esc } from '../global/utils.js';

export async function loadAntrean() {
  const tglInput = $('#antrean-tanggal');

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  if (!tglInput.value) tglInput.value = today;

  const el = $('#antrean-table');
  el.innerHTML = '<div class="loading">Memuat…</div>';

  try {
    const { data } = await apiFetch(
      'global/antrean.php?tanggal=' + encodeURIComponent(tglInput.value)
    );

    // if (data.length === 0) {
    //   el.innerHTML = '<div class="empty-state">Tidak ada antrean pada tanggal ini.</div>';
    //   return;
    // }

    if (data.length === 0) {
        const message = tglInput.value === today
            ? 'Belum ada pendaftaran hari ini.'
            : 'Belum ada pendaftaran pada tanggal ini.';

        el.innerHTML = `<div class="empty-state">${message}</div>`;
        return;
    }
    
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>No. Antrean</th><th>Pasien</th><th>Dokter</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${data.map(r => `
              <tr>
                <td class="cell-name">${esc(r.no_antrean)}</td>
                <td>${esc(r.pasien_nama)} <span class="cell-muted">(${esc(r.no_rm)})</span></td>
                <td>${esc(r.dokter_nama)} <span class="cell-muted">· ${esc(r.spesialis)}</span></td>
                <td>${badge(r.status)}</td>
                <td>
                  <select data-status-antrean="${r.id}" class="btn btn--ghost btn--sm">
                    ${['menunggu','menunggu_dokter','diperiksa','menunggu_lab','selesai','batal'].map(s =>
                      `<option value="${s}" ${r.status===s?'selected':''}>${STATUS_LABEL[s].label}</option>`
                    ).join('')}
                  </select>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    $$('[data-status-antrean]').forEach(sel => {
      sel.onchange = async () => {
        const id = Number(sel.dataset.statusAntrean);
        try {
          await apiFetch('global/antrean.php', {
            method: 'PUT',
            body: JSON.stringify({ id, status: sel.value })
          });
          loadAntrean();
        } catch (err) {
          alert(err.message);
          loadAntrean();
        }
      };
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}

export function initAntreanEvents() {
  $('#antrean-tanggal').addEventListener('change', loadAntrean);
}
