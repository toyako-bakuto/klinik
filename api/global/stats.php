<?php
/**
 * Statistik dashboard seluruh portal.
 *
 * Role:
 * admin, resepsionis, dokter, perawat, lab, apoteker, kasir.
 *
 * Admin       : statistik umum.
 * Resepsionis : statistik pendaftaran.
 * Dokter      : statistik antrean dokter sendiri.
 * Perawat     : statistik pemeriksaan awal.
 * Lab         : statistik laboratorium.
 * Apoteker    : statistik resep dan stok obat.
 * Kasir       : statistik transaksi dan pembayaran.
 */
declare(strict_types=1);

require __DIR__ . '/koneksi.php';
require __DIR__ . '/helper.php';

$sess = requireRole([
    'admin',
    'resepsionis',
    'dokter',
    'perawat',
    'lab',
    'apoteker',
    'kasir',
]);

$role  = $sess['role'];
$today = date('Y-m-d');

// =========================================================
// FUNGSI UMUM
// =========================================================

function countByStatus(mysqli $conn, string $table, string $status): int
{
    // Nama tabel berasal dari kode internal.
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c FROM {$table} WHERE status = ?"
    );

    $stmt->bind_param('s', $status);
    $stmt->execute();

    $count = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    return $count;
}

// =========================================================
// FUNGSI STATISTIK LAB
// =========================================================

function labCountByStatus(mysqli $conn, string $status): int
{
    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS c
         FROM permintaan_lab
         WHERE status = ?'
    );

    $stmt->bind_param('s', $status);
    $stmt->execute();

    $count = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    return $count;
}

// =========================================================
// FUNGSI STATISTIK DOKTER
// =========================================================

function dokterCountByStatus(
    mysqli $conn,
    string $status,
    int $dokterId,
    string $today
): int {
    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS c
         FROM pendaftaran
         WHERE tanggal = ?
           AND status = ?
           AND dokter_id = ?'
    );

    $stmt->bind_param('ssi', $today, $status, $dokterId);
    $stmt->execute();

    $count = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    return $count;
}

// =========================================================
// STATISTIK LAB
// =========================================================

if ($role === 'lab') {

    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c
         FROM permintaan_lab
         WHERE status = 'divalidasi'
           AND DATE(divalidasi_at) = ?"
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $selesaiHariIni = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    jsonOk([
        'stats' => [
            'masuk'             => labCountByStatus($conn, 'diminta'),
            'sampel_diambil'    => labCountByStatus($conn, 'sampel_diambil'),
            'diproses'          => labCountByStatus($conn, 'diproses'),
            'menunggu_validasi' => labCountByStatus($conn, 'hasil_diinput'),
            'selesai_hari_ini'  => $selesaiHariIni,
        ],
    ]);
}

// =========================================================
// STATISTIK DOKTER
// =========================================================

elseif ($role === 'dokter') {

    $stmt = $conn->prepare(
        'SELECT id
         FROM dokter
         WHERE user_id = ?
         LIMIT 1'
    );

    $userId = (int)$sess['user_id'];

    $stmt->bind_param('i', $userId);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();

    $stmt->close();

    if (!$row) {
        jsonErr('Akun dokter belum terhubung.', 403);
    }

    $dokterId = (int)$row['id'];

    jsonOk([
        'stats' => [
            'menunggu_dokter' => dokterCountByStatus(
                $conn,
                'menunggu_dokter',
                $dokterId,
                $today
            ),

            'diperiksa' => dokterCountByStatus(
                $conn,
                'diperiksa',
                $dokterId,
                $today
            ),

            'menunggu_lab' => dokterCountByStatus(
                $conn,
                'menunggu_lab',
                $dokterId,
                $today
            ),

            'selesai' => dokterCountByStatus(
                $conn,
                'selesai',
                $dokterId,
                $today
            ),
        ],
    ]);
}

// =========================================================
// STATISTIK ADMIN DAN RESEPSIONIS
// =========================================================

elseif (in_array($role, ['admin', 'resepsionis'], true)) {

    $totalPasien = (int)$conn
        ->query('SELECT COUNT(*) AS c FROM pasien')
        ->fetch_assoc()['c'];

    // Kunjungan hari ini
    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS c
         FROM pendaftaran
         WHERE tanggal = ?'
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $kunjunganHariIni = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    // Antrean menunggu hari ini
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c
         FROM antrean a
         JOIN pendaftaran p ON p.id = a.pendaftaran_id
         WHERE p.tanggal = ?
           AND a.status = 'menunggu'"
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $menunggu = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    // Pendaftaran selesai hari ini
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c
         FROM pendaftaran
         WHERE tanggal = ?
           AND status = 'selesai'"
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $selesai = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    jsonOk([
        'stats' => [
            'total_pasien'       => $totalPasien,
            'kunjungan_hari_ini' => $kunjunganHariIni,
            'menunggu'           => $menunggu,
            'selesai'            => $selesai,
        ],
    ]);
}

// =========================================================
// STATISTIK PERAWAT
// =========================================================

elseif ($role === 'perawat') {

    // Pasien menunggu pemeriksaan awal
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c
         FROM pendaftaran p
         LEFT JOIN pemeriksaan_awal pa
            ON pa.pendaftaran_id = p.id
         WHERE p.tanggal = ?
           AND p.status = 'menunggu'
           AND pa.id IS NULL"
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $menunggu = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    // Pemeriksaan awal draft
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c
         FROM pemeriksaan_awal pa
         JOIN pendaftaran p ON p.id = pa.pendaftaran_id
         WHERE p.tanggal = ?
           AND pa.status = 'draft'"
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $draft = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    // Pemeriksaan awal selesai
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c
         FROM pemeriksaan_awal pa
         JOIN pendaftaran p ON p.id = pa.pendaftaran_id
         WHERE p.tanggal = ?
           AND pa.status = 'selesai'"
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $selesai = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    // Total pendaftaran hari ini
    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS c
         FROM pendaftaran
         WHERE tanggal = ?'
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $totalHariIni = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    jsonOk([
        'stats' => [
            'menunggu'       => $menunggu,
            'draft'          => $draft,
            'selesai'        => $selesai,
            'total_hari_ini' => $totalHariIni,
        ],
    ]);
}

// =========================================================
// STATISTIK APOTEKER
// =========================================================

elseif ($role === 'apoteker') {

    // Resep diserahkan hari ini
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c
         FROM resep
         WHERE status = 'diserahkan'
           AND DATE(diserahkan_at) = ?"
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $selesaiHariIni = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    // Total obat aktif
    $totalObat = (int)$conn
        ->query(
            'SELECT COUNT(*) AS c
             FROM master_obat
             WHERE aktif = 1'
        )
        ->fetch_assoc()['c'];

    // Obat dengan stok menipis
    $stokMenipis = (int)$conn
        ->query(
            'SELECT COUNT(*) AS c
             FROM master_obat
             WHERE aktif = 1
               AND stok <= 10'
        )
        ->fetch_assoc()['c'];

    jsonOk([
        'stats' => [
            'masuk'            => countByStatus($conn, 'resep', 'masuk'),
            'diverifikasi'     => countByStatus($conn, 'resep', 'diverifikasi'),
            'disiapkan'        => countByStatus($conn, 'resep', 'disiapkan'),
            'selesai_hari_ini' => $selesaiHariIni,
            'total_obat'       => $totalObat,
            'stok_menipis'     => $stokMenipis,
        ],
    ]);
}

// =========================================================
// STATISTIK KASIR
// =========================================================

elseif ($role === 'kasir') {

    // Pendapatan hari ini (pembayaran non-void)
    $stmt = $conn->prepare(
        "SELECT COALESCE(SUM(nominal), 0) AS total
         FROM pembayaran
         WHERE void = 0
           AND DATE(created_at) = ?"
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $pendapatanHariIni = (float)$stmt->get_result()->fetch_assoc()['total'];

    $stmt->close();

    // Transaksi hari ini
    $stmt = $conn->prepare(
        "SELECT COUNT(DISTINCT tagihan_id) AS c
         FROM pembayaran
         WHERE void = 0
           AND DATE(created_at) = ?"
    );

    $stmt->bind_param('s', $today);
    $stmt->execute();

    $transaksiHariIni = (int)$stmt->get_result()->fetch_assoc()['c'];

    $stmt->close();

    // Tagihan belum bayar
    $belumBayar = (int)$conn
        ->query(
            "SELECT COUNT(*) AS c
             FROM tagihan
             WHERE status = 'belum_bayar'"
        )
        ->fetch_assoc()['c'];

    // Tagihan sebagian
    $sebagian = (int)$conn
        ->query(
            "SELECT COUNT(*) AS c
             FROM tagihan
             WHERE status = 'sebagian'"
        )
        ->fetch_assoc()['c'];

    jsonOk([
        'stats' => [
            'pendapatan_hari_ini' => $pendapatanHariIni,
            'transaksi_hari_ini'  => $transaksiHariIni,
            'belum_bayar'         => $belumBayar,
            'sebagian'            => $sebagian,
        ],
    ]);
}