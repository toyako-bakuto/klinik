<?php
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

requireRole(['admin', 'resepsionis']);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $rows = $conn->query(
        'SELECT j.id, j.hari, j.jam_mulai, j.jam_selesai, j.ruang,
                d.id AS dokter_id, d.nama AS dokter_nama, d.spesialis
         FROM jadwal_dokter j
         JOIN dokter d ON d.id = j.dokter_id
         ORDER BY FIELD(j.hari,
           "Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"),
           j.jam_mulai ASC'
    )->fetch_all(MYSQLI_ASSOC);
    jsonOk(['data' => $rows]);
}

if ($method === 'POST') {
    $in = jsonInput();
    $dokter_id = (int)($in['dokter_id'] ?? 0);
    $hari      = strInput($in, 'hari');
    $mulai     = strInput($in, 'jam_mulai');
    $selesai   = strInput($in, 'jam_selesai');
    $ruang     = strInput($in, 'ruang');

    $hariValid = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
    if ($dokter_id <= 0 || !in_array($hari, $hariValid, true)
        || $mulai === '' || $selesai === '') {
        jsonErr('Data jadwal tidak valid.', 422);
    }

    $stmt = $conn->prepare(
        'INSERT INTO jadwal_dokter (dokter_id, hari, jam_mulai, jam_selesai, ruang)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('issss', $dokter_id, $hari, $mulai, $selesai, $ruang);
    $stmt->execute();
    $id = $stmt->insert_id;
    $stmt->close();

    jsonOk(['message' => 'Jadwal ditambahkan.', 'id' => $id]);
}

if ($method === 'DELETE') {
    $in = jsonInput();
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) jsonErr('ID tidak valid.', 422);

    $stmt = $conn->prepare('DELETE FROM jadwal_dokter WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();

    jsonOk(['message' => 'Jadwal dihapus.']);
}

jsonErr('Method tidak diizinkan.', 405);