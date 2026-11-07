import { makeApi }   from '../global/api.js';
import { makeBadge } from '../global/utils.js';

export const API = '../api/global/';
export const apiFetch = makeApi(API);

export const state = {
  user: null,
  pasien: [],
  dokter: [],
};

export const STATUS_LABEL = {
    menunggu: {
        label: 'Menunggu',
        cls: 'badge--waiting'
    },
    menunggu_dokter: {
        label: 'Menunggu Dokter',
        cls: 'badge--progress'
    },
  
    diperiksa: 
    {
        label: 'Diperiksa',
        cls: 'badge--progress'
    },
  
    menunggu_lab: {
        label: 'Menunggu Lab',
        cls: 'badge--progress'
    },
    selesai: {
        label: 'Selesai',
        cls: 'badge--done'
    },
    batal: {
        label: 'Batal',
        cls: 'badge--cancel'
    },
};

export const badge = makeBadge(STATUS_LABEL);

export const JANJI_LABEL = {
  dijadwalkan:  { label: 'Dijadwalkan',  cls: 'badge--waiting'  },
  dikonfirmasi: { label: 'Dikonfirmasi', cls: 'badge--progress' },
  selesai:      { label: 'Selesai',      cls: 'badge--done'     },
  dibatalkan:   { label: 'Dibatalkan',   cls: 'badge--cancel'   },
};

export const TITLES = {
  dashboard:   'Dashboard',
  pasien:      'Data Pasien',
  pendaftaran: 'Pendaftaran',
  antrean:     'Antrean',
  jadwal:      'Jadwal Dokter',
  riwayat:     'Riwayat Kunjungan',
  janji:       'Janji Temu',
};
