import { initAuth }            from '../global/auth.js';
import { initNavigation }      from '../global/navigation.js';
import { on }                  from '../global/events.js';
import { API, state, TITLES }  from './config.js';

import { loadDashboard }                       from './dashboard.js';
import { loadAntrean, initAntreanEvents }      from './antrean.js';
import { loadRiwayat, initRiwayatEvents }      from './riwayat.js';
import { showPemeriksaan }                     from './pemeriksaan.js';

(function boot() {
  initAntreanEvents();
  initRiwayatEvents();

  initNavigation({
    titles: TITLES,
    loaders: {
      dashboard: loadDashboard,
      antrean:   loadAntrean,
      riwayat:   loadRiwayat,
      // pemeriksaan — tidak punya loader, dirender via mulaiPemeriksaan
    }
  });

  initAuth({
    apiBase: API,
    state,
    onReady: () => loadDashboard()
  });

  on('perawat:pa-finalized', () => loadAntrean());
})();
