<?php
/**
 * Laporan keuangan.
 * GET ?dari=&sampai=    → rekap
 * GET ?dari=&sampai=&format=csv  → unduh CSV
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

requireRole(['kasir', 'admin']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonErr('Method tidak diizinkan.', 405);

$dari   = trim((string)($_GET['dari']   ?? date('Y-m-01')));
$sampai = trim((string)($_GET['sampai'] ?? date('Y-m-d')));
$format = trim((string)($_GET['format'] ?? ''));

// Total pendapatan
$stmt = $conn->prepare(
    "SELECT COALESCE(SUM(nominal), 0) AS total
     FROM pembayaran
     WHERE void = 0 AND DATE(created_at) BETWEEN ? AND ?"
);
$stmt->bind_param('ss', $dari, $sampai);
$stmt->execute();
$totalPendapatan = (float)$stmt->get_result()->fetch_assoc()['total'];
$stmt->close();

// Breakdown metode bayar
$stmt = $conn->prepare(
    "SELECT metode, COALESCE(SUM(nominal), 0) AS total, COUNT(*) AS jml
     FROM pembayaran
     WHERE void = 0 AND DATE(created_at) BETWEEN ? AND ?
     GROUP BY metode"
);
$stmt->bind_param('ss', $dari, $sampai);
$stmt->execute();
$perMetode = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// Transaksi detail
$stmt = $conn->prepare(
    "SELECT pb.id, pb.created_at, pb.metode, pb.nominal, pb.catatan,
            t.no_tagihan, t.total AS total_tagihan, t.status AS status_tagihan,
            p.tanggal, p.no_reg,
            ps.no_rm, ps.nama AS pasien_nama,
            u.nama_lengkap AS kasir_nama
     FROM pembayaran pb
     JOIN tagihan t     ON t.id = pb.tagihan_id
     JOIN pendaftaran p ON p.id = t.pendaftaran_id
     JOIN pasien ps     ON ps.id = t.pasien_id
     LEFT JOIN users u  ON u.id = pb.created_by
     WHERE pb.void = 0 AND DATE(pb.created_at) BETWEEN ? AND ?
     ORDER BY pb.created_at ASC"
);
$stmt->bind_param('ss', $dari, $sampai);
$stmt->execute();
$transaksi = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// CSV export
if ($format === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="laporan-kasir-' . $dari . '_' . $sampai . '.csv"');
    $out = fopen('php://output', 'w');
    fputs($out, "\xEF\xBB\xBF"); // BOM UTF-8
    fputcsv($out, ['Tanggal', 'No Tagihan', 'No Reg', 'Pasien', 'No RM', 'Metode', 'Nominal', 'Kasir', 'Catatan']);
    foreach ($transaksi as $t) {
        fputcsv($out, [
            $t['created_at'],
            $t['no_tagihan'],
            $t['no_reg'],
            $t['pasien_nama'],
            $t['no_rm'],
            $t['metode'],
            $t['nominal'],
            $t['kasir_nama'] ?? '',
            $t['catatan'] ?? '',
        ]);
    }
    fclose($out);
    exit;
}

jsonOk([
    'dari'   => $dari,
    'sampai' => $sampai,
    'total'  => $totalPendapatan,
    'per_metode' => $perMetode,
    'transaksi'  => $transaksi,
]);