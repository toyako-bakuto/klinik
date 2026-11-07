<?php
/**
 * Guard session seluruh portal.
 *
 * Role:
 * admin, resepsionis, perawat, dokter, lab, apoteker, kasir.
 *
 * Mengembalikan informasi user dan dokter_id
 * jika role = dokter.
 */
declare(strict_types=1);

require __DIR__ . '/koneksi.php';
require __DIR__ . '/helper.php';

// Validasi session dan role
$sess = requireRole([
    'admin',
    'resepsionis',
    'perawat',
    'dokter',
    'lab',
    'apoteker',
    'kasir',
]);

$dokterId = null;

// Cari dokter_id jika role dokter
if ($sess['role'] === 'dokter') {

    $stmt = $conn->prepare(
        'SELECT id
         FROM dokter
         WHERE user_id = ?
         LIMIT 1'
    );

    $userId = (int) $sess['user_id'];

    $stmt->bind_param('i', $userId);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        jsonErr(
            'Akun dokter belum terhubung ke data dokter. Hubungi admin.',
            403
        );
    }

    $dokterId = (int) $row['id'];
}

// Kirim informasi session
jsonOk([
    'user' => [
        'id'        => (int) $sess['user_id'],
        'nama'      => $sess['nama'],
        'role'      => $sess['role'],
        'dokter_id' => $dokterId,
    ],
]);