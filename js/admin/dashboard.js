import { $, esc, fmtDate } from '../global/utils.js';
import { apiFetch, badge } from './config.js';

export async function loadDashboard() {
    try {
        const { stats } = await apiFetch('global/stats.php');
        const grid = $('#stats-grid');
        const cards = [
            ['Total Pasien', stats.total_pasien, 'Terdaftar di sistem'],
            ['Hari Ini', stats.kunjungan_hari_ini,'Kunjungan tercatat'],
            ['Menunggu', stats.menunggu, 'Dalam antrean'],
            ['Terlayani', stats.selesai, 'Sudah dilayani hari ini'],
        ];

        grid.innerHTML = cards.map(([l, v, h]) => `
            <div class="stat-card">
                <p class="stat-label">${esc(l)}</p>
                <p class="stat-value">${esc(v)}</p>
                <p class="stat-hint">${esc(h)}</p>
            </div>
        `).join('');
    
        const { data } = await apiFetch('admin/pendaftaran.php');
        const recent = data.slice(0, 5);
        const el = $('#dashboard-recent');
        if (recent.length === 0) {
            el.innerHTML = '<div class="empty-state">Belum ada pendaftaran.</div>';
            return;
        }
    
        el.innerHTML = `
            <div class="table-wrapper">
                <table>
                <thead>
                    <tr>
                        <th>Pasien</th>
                        <th>No. RM</th>
                        <th>Dokter</th>
                        <th>Tanggal</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(r => `
                    <tr>
                        <td class="cell-name">${esc(r.pasien_nama)}</td>
                        <td class="cell-muted">${esc(r.no_rm)}</td>
                        <td>${esc(r.dokter_nama)}</td>
                        <td class="cell-muted">${fmtDate(r.tanggal)}</td>
                        <td>${badge(r.status)}</td>
                    </tr>`).join('')}
                </tbody>
                </table>
            </div>`;
    } catch (err) {
        $('#dashboard-recent').innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    }
}
