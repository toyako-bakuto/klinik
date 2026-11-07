import { makeApi }   from '../global/api.js';
import { makeBadge } from '../global/utils.js';

export const API = '../api/';
export const apiFetch = makeApi(API);

export const state = {
  user: null,
  antrean: [],
  currentPA: null,
};

export const STATUS_LABEL = {
  menunggu:        { label: 'Menunggu',        cls: 'badge--waiting'  },
  menunggu_dokter: { label: 'Menunggu Dokter', cls: 'badge--progress' },
  diperiksa:       { label: 'Diperiksa',       cls: 'badge--progress' },
  selesai:         { label: 'Selesai',         cls: 'badge--done'     },
  batal:           { label: 'Batal',           cls: 'badge--cancel'   },
  draft:           { label: 'Draft',           cls: 'badge--draft'    },
};

export const badge = makeBadge(STATUS_LABEL);

export const TITLES = {
  dashboard:   'Dashboard',
  antrean:     'Antrean Pasien',
  pemeriksaan: 'Pemeriksaan Awal',
  riwayat:     'Riwayat Keperawatan',
};
