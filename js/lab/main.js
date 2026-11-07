import { initAuth }            from '../global/auth.js';
import { initNavigation }      from '../global/navigation.js';
import { API, state, TITLES }  from './config.js';

import { loadDashboard }                        from './dashboard.js';
import { loadPermintaan, initPermintaanEvents } from './permintaan.js';
import { loadValidasi }                         from './validasi.js';
import { loadRiwayat, initRiwayatEvents }       from './riwayat.js';

(function boot() {
  initPermintaanEvents();
  initRiwayatEvents();

  initNavigation({
    titles: TITLES,
    loaders: {
      dashboard:  loadDashboard,
      permintaan: loadPermintaan,
      validasi:   loadValidasi,
      riwayat:    loadRiwayat,
    }
  });

  initAuth({
    apiBase: API,
    state,
    onReady: () => loadDashboard()
  });
})();
