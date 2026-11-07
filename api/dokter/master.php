<?php
/**
 * Master data untuk dropdown: obat & lab.
 * GET ?type=obat | ?type=lab
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

requireRole(['dokter', 'admin']);

$type = trim((string)($_GET['type'] ?? ''));

if ($type === 'obat') {
    $rows = $conn->query('SELECT id, nama, satuan FROM master_obat ORDER BY nama ASC')
        ->fetch_all(MYSQLI_ASSOC);
    jsonOk(['data' => $rows]);
}
if ($type === 'lab') {
    $rows = $conn->query('SELECT id, nama FROM master_lab ORDER BY nama ASC')
        ->fetch_all(MYSQLI_ASSOC);
    jsonOk(['data' => $rows]);
}

jsonErr('type wajib diisi (obat / lab).', 422);