import { makeApi }   from '../global/api.js';
import { makeBadge } from '../global/utils.js';

export const API = '../api/';
export const apiFetch = makeApi(API);

export const state = {
  user: null,
  masterObat: [],
  masterLab: [],
  currentRM: null,
};

export const STATUS_LABEL = {
  menunggu:        { label: 'Menunggu',        cls: 'badge--waiting'  },
  menunggu_dokter: { label: 'Menunggu Dokter', cls: 'badge--waiting'  },
  diperiksa:       { label: 'Diperiksa',       cls: 'badge--progress' },
  menunggu_lab:    { label: 'Menunggu Lab',    cls: 'badge--lab'      },
  selesai:         { label: 'Selesai',         cls: 'badge--done'     },
  batal:           { label: 'Batal',           cls: 'badge--cancel'   },
  draft:           { label: 'Draft',           cls: 'badge--draft'    },
};

export const badge = makeBadge(STATUS_LABEL);

export const TITLES = {
  dashboard:   'Dashboard',
  antrean:     'Antrean Pemeriksaan',
  pemeriksaan: 'Pemeriksaan',
  riwayat:     'Riwayat Pemeriksaan',
};
