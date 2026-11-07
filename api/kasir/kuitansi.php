<?php
/**
 * Detail kuitansi (data untuk HTML print).
 * GET ?tagihan_id=X
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

requireRole(['kasir', 'admin']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonErr('Method tidak diizinkan.', 405);

$id = (int)($_GET['tagihan_id'] ?? 0);
if ($id <= 0) jsonErr('tagihan_id wajib.', 422);

// Tagihan + info
$stmt = $conn->prepare(
    "SELECT t.*,
            p.tanggal, p.no_reg,
            ps.no_rm, ps.nama AS pasien_nama, ps.alamat, ps.telepon,
            d.nama AS dokter_nama, d.spesialis
     FROM tagihan t
     JOIN pendaftaran p ON p.id = t.pendaftaran_id
     JOIN pasien ps     ON ps.id = t.pasien_id
     JOIN dokter d      ON d.id = p.dokter_id
     WHERE t.id = ? LIMIT 1"
);
$stmt->bind_param('i', $id);
$stmt->execute();
$tagihan = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$tagihan) jsonErr('Tagihan tidak ditemukan.', 404);

// Item
$stmt = $conn->prepare(
    'SELECT * FROM tagihan_item WHERE tagihan_id = ? ORDER BY id ASC'
);
$stmt->bind_param('i', $id);
$stmt->execute();
$items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

// Pembayaran
$stmt = $conn->prepare(
    'SELECT pb.*, u.nama_lengkap AS kasir_nama
     FROM pembayaran pb
     LEFT JOIN users u ON u.id = pb.created_by
     WHERE pb.tagihan_id = ?
     ORDER BY pb.created_at ASC'
);
$stmt->bind_param('i', $id);
$stmt->execute();
$pembayaran = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

jsonOk([
    'tagihan'    => $tagihan,
    'items'      => $items,
    'pembayaran' => $pembayaran,
]);