/* =========================================================
   GLOBAL UTILS — fungsi murni, tidak bergantung role
   ========================================================= */

export const $  = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

export function fmtDateTime(s) {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d)) return s;
  return d.toLocaleString('id-ID', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

export function fmtTime(t) {
  return t ? t.substring(0, 5) : '—';
}

export function fmtRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function age(dob) {
  if (!dob) return '—';
  const b = new Date(dob); if (isNaN(b)) return '—';
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a + ' th';
}

/* Factory badge — tiap role punya label map sendiri */
export function makeBadge(labelMap) {
  return function badge(status) {
    const b = labelMap[status] ?? { label: status || '—', cls: '' };
    return `<span class="badge ${b.cls}">${esc(b.label)}</span>`;
  };
}
