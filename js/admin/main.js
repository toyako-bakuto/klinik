import { bindModalClose }     from '../global/modal.js';
import { initAuth }           from '../global/auth.js';
import { initNavigation }     from '../global/navigation.js';
import { API, state, TITLES } from './config.js';

import { loadDashboard }        from './dashboard.js';
import { loadPasien, initPasienEvents }           from './pasien.js';
import { loadPendaftaran, initPendaftaranEvents } from './pendaftaran.js';
import { loadAntrean, initAntreanEvents }         from './antrean.js';
import { loadJadwal, initJadwalEvents }           from './jadwal.js';
import { loadRiwayat, initRiwayatEvents }         from './riwayat.js';
import { loadJanji, initJanjiEvents }             from './janji.js';
import { loadDokter }                             from './dokter.js';

(function boot() {
  bindModalClose();

  initPasienEvents();
  initPendaftaranEvents();
  initAntreanEvents();
  initJadwalEvents();
  initRiwayatEvents();
  initJanjiEvents();

  initNavigation({
    titles: TITLES,
    loaders: {
      dashboard:   loadDashboard,
      pasien:      loadPasien,
      pendaftaran: loadPendaftaran,
      antrean:     loadAntrean,
      jadwal:      loadJadwal,
      riwayat:     loadRiwayat,
      janji:       loadJanji,
    }
  });

  initAuth({
    apiBase: API,
    state,
    onReady: async () => {
      await loadDokter();
      loadDashboard();
    }
  });
})();
