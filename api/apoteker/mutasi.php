<?php
/**
 * Riwayat mutasi stok obat.
 * GET ?obat_id=X&dari=&sampai=  (kalau obat_id kosong, tampil semua)
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

requireRole(['apoteker', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonErr('Method tidak diizinkan.', 405);

$obatId = (int)($_GET['obat_id'] ?? 0);
$dari   = trim((string)($_GET['dari']   ?? ''));
$sampai = trim((string)($_GET['sampai'] ?? ''));

$sql = "SELECT m.id, m.tipe, m.jumlah, m.stok_sebelum, m.stok_sesudah,
               m.referensi, m.catatan, m.created_at,
               o.nama AS obat_nama, o.satuan,
               u.nama_lengkap AS user_nama
        FROM obat_mutasi m
        JOIN master_obat o ON o.id = m.obat_id
        LEFT JOIN users u ON u.id = m.created_by
        WHERE 1=1";
$types = ''; $params = [];

if ($obatId > 0) {
    $sql .= ' AND m.obat_id = ?';
    $types .= 'i'; $params[] = $obatId;
}
if ($dari !== '') {
    $sql .= ' AND DATE(m.created_at) >= ?';
    $types .= 's'; $params[] = $dari;
}
if ($sampai !== '') {
    $sql .= ' AND DATE(m.created_at) <= ?';
    $types .= 's'; $params[] = $sampai;
}
$sql .= ' ORDER BY m.created_at DESC LIMIT 200';

$stmt = $conn->prepare($sql);
if ($types !== '') $stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

jsonOk(['data' => $rows]);