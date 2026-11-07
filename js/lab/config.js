import { makeApi }   from '../global/api.js';
import { makeBadge } from '../global/utils.js';

export const API = '../api/';
export const apiFetch = makeApi(API);

export const state = {
  user: null,
  current: null,
};

export const STATUS_LABEL = {
  diminta:        { label: 'Diminta',         cls: 'badge--waiting'  },
  sampel_diambil: { label: 'Sampel Diambil',  cls: 'badge--progress' },
  diproses:       { label: 'Diproses',        cls: 'badge--progress' },
  hasil_diinput:  { label: 'Hasil Diinput',   cls: 'badge--progress' },
  divalidasi:     { label: 'Divalidasi',      cls: 'badge--done'     },
  ditolak:        { label: 'Ditolak',         cls: 'badge--danger'   },
};

export const badge = makeBadge(STATUS_LABEL);

export const JENIS_SAMPEL = ['darah', 'urin', 'feses', 'swab', 'sputum', 'lain'];

export const TITLES = {
  dashboard:  'Dashboard',
  permintaan: 'Permintaan Lab',
  sampel:     'Sampel',
  hasil:      'Hasil Pemeriksaan',
  validasi:   'Validasi Hasil',
  riwayat:    'Riwayat Laboratorium',
};
