import { initAuth }            from '../global/auth.js';
import { initNavigation }      from '../global/navigation.js';
import { on }                  from '../global/events.js';
import { API, state, TITLES }  from './config.js';

import { loadDashboard }                          from './dashboard.js';
import { loadAntrean, initAntreanEvents }         from './antrean.js';
import { loadRiwayat, initRiwayatEvents }         from './riwayat.js';
import { loadAllMaster }                          from './master.js';

(function boot() {
  initAntreanEvents();
  initRiwayatEvents();

  initNavigation({
    titles: TITLES,
    loaders: {
      dashboard: loadDashboard,
      antrean:   loadAntrean,
      riwayat:   loadRiwayat,
      // pemeriksaan — dirender via panggilPasien
    }
  });

  initAuth({
    apiBase: API,
    state,
    onReady: async () => {
      await loadAllMaster();
      loadDashboard();
    }
  });

  on('dokter:rm-finalized', () => loadAntrean());
})();
