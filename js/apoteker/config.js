import { makeApi }   from '../global/api.js';
import { makeBadge } from '../global/utils.js';

export const API = '../api/';
export const apiFetch = makeApi(API);

export const state = {
  user: null,
  obat: [],
  currentResep: null,
};

export const RESEP_LABEL = {
  masuk:        { label: 'Masuk',        cls: 'badge--waiting'  },
  diverifikasi: { label: 'Diverifikasi', cls: 'badge--progress' },
  disiapkan:    { label: 'Disiapkan',    cls: 'badge--progress' },
  diserahkan:   { label: 'Diserahkan',   cls: 'badge--done'     },
  ditolak:      { label: 'Ditolak',      cls: 'badge--danger'   },
};

export const resepBadge = makeBadge(RESEP_LABEL);

export const TITLES = {
  dashboard:  'Dashboard',
  masuk:      'Resep Masuk',
  verifikasi: 'Verifikasi Resep',
  penyiapan:  'Penyiapan Obat',
  penyerahan: 'Penyerahan Obat',
  obat:       'Data Obat',
  stok:       'Stok Obat',
  riwayat:    'Riwayat Resep',
};
