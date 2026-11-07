import { makeApi }   from '../global/api.js';
import { makeBadge } from '../global/utils.js';

export const API = '../api/';
export const apiFetch = makeApi(API);

export const state = {
  user: null,
  currentTagihan: null,
};

export const TAGIHAN_LABEL = {
  belum_bayar: { label: 'Belum Bayar', cls: 'badge--waiting'  },
  sebagian:    { label: 'Sebagian',    cls: 'badge--progress' },
  lunas:       { label: 'Lunas',       cls: 'badge--done'     },
  dibatalkan:  { label: 'Dibatalkan',  cls: 'badge--cancel'   },
};

export const tagihanBadge = makeBadge(TAGIHAN_LABEL);

export const TITLES = {
  dashboard:  'Dashboard',
  tagihan:    'Tagihan',
  pembayaran: 'Pembayaran',
  riwayat:    'Riwayat Transaksi',
  kuitansi:   'Kuitansi',
  laporan:    'Laporan Keuangan',
};
