import { initAuth }            from '../global/auth.js';
import { initNavigation }      from '../global/navigation.js';
import { API, state, TITLES }  from './config.js';

import { loadDashboard }                          from './dashboard.js';
import { loadTagihan, initTagihanEvents }         from './tagihan.js';
import { initPembayaranEvents, registerPembayaranHooks } from './pembayaran.js';
import { loadKuitansiList, initKuitansiEvents, registerKuitansiHooks } from './kuitansi.js';
import { loadLaporan, initLaporanEvents }         from './laporan.js';
import { loadRiwayat, initRiwayatEvents }         from './riwayat.js';

(function boot() {
  // Hooks DULU — supaya tagihan.js bisa akses openPembayaran & cetakKuitansi
  registerPembayaranHooks();
  registerKuitansiHooks();

  initTagihanEvents();
  initPembayaranEvents();
  initKuitansiEvents();
  initLaporanEvents();
  initRiwayatEvents();

  initNavigation({
    titles: TITLES,
    loaders: {
      dashboard:  loadDashboard,
      tagihan:    loadTagihan,
      riwayat:    loadRiwayat,
      kuitansi:   loadKuitansiList,
      laporan:    loadLaporan,
      // pembayaran — dirender via openPembayaran
    }
  });

  initAuth({
    apiBase: API,
    state,
    onReady: () => {
      // Set default laporan tanggal
      const now = new Date();
      const fromInput = document.querySelector('#laporan-dari');
      const toInput   = document.querySelector('#laporan-sampai');
      if (fromInput) fromInput.value = now.toISOString().slice(0, 8) + '01';
      if (toInput)   toInput.value   = now.toISOString().slice(0, 10);

      loadDashboard();
    }
  });
})();
