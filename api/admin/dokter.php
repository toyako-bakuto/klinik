<?php
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

requireRole(['admin', 'resepsionis']);

$rows = $conn->query(
    'SELECT id, nama, spesialis, no_sip, telepon
     FROM dokter ORDER BY nama ASC'
)->fetch_all(MYSQLI_ASSOC);

jsonOk(['data' => $rows]);  