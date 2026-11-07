/* =========================================================
   GENERIC NAVIGATION
   ========================================================= */
import { $, $$ } from './utils.js';

export function initNavigation({ titles, loaders = {}, defaultTitle = 'Dashboard' }) {
  $$('.sidebar [data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;

      $$('.content-section').forEach(s => {
        s.hidden = s.id !== `section-${target}`;
      });
      $$('.sidebar [data-target]').forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });

      const title = titles[target] || defaultTitle;
      $('#page-title').textContent        = title;
      $('#breadcrumb-active').textContent = title;

      if (history.replaceState) history.replaceState(null, '', `#${target}`);

      const loader = loaders[target];
      if (typeof loader === 'function') loader();
    });
  });

  const hash = location.hash.replace('#', '');
  if (hash) {
    const btn = document.querySelector(`.sidebar [data-target="${hash}"]`);
    if (btn) btn.click();
  }
}
