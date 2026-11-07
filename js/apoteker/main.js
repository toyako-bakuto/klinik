import { bindModalClose }      from '../global/modal.js';
import { initAuth }            from '../global/auth.js';
import { initNavigation }      from '../global/navigation.js';
import { API, state, TITLES }  from './config.js';

import { loadDashboard }                                    from './dashboard.js';
import { loadMasuk, loadVerifikasi, loadPenyiapan, loadPenyerahan, initResepEvents } from './resep.js';
import { loadObatList, renderObat, initObatEvents }         from './obat.js';
import { loadStok, initStokEvents }                         from './stok.js';
import { loadRiwayat, initRiwayatEvents }                   from './riwayat.js';

(function boot() {
  bindModalClose();

  initResepEvents();
  initObatEvents();
  initStokEvents();
  initRiwayatEvents();

  initNavigation({
    titles: TITLES,
    loaders: {
      dashboard:  loadDashboard,
      masuk:      loadMasuk,
      verifikasi: loadVerifikasi,
      penyiapan:  loadPenyiapan,
      penyerahan: loadPenyerahan,
      obat:       () => loadObatList().then(renderObat),
      stok:       loadStok,
      riwayat:    loadRiwayat,
    }
  });

  initAuth({
    apiBase: API,
    state,
    onReady: async () => {
      await loadObatList();
      loadDashboard();
    }
  });
})();
