<?php
/**
 * Ambil sampel.
 * POST { id, jenis_sampel?, catatan_sampel? }
 *   → status diminta → sampel_diambil
 * POST { id, action:'proses' }
 *   → status sampel_diambil → diproses
 * POST { id, action:'tolak', alasan }
 *   → status ditolak
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['lab', 'admin']);
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') jsonErr('Method tidak diizinkan.', 405);

$in = jsonInput();
$id = (int)($in['id'] ?? 0);
if ($id <= 0) jsonErr('ID wajib.', 422);

// Ambil data
$stmt = $conn->prepare('SELECT status FROM permintaan_lab WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$row) jsonErr('Permintaan lab tidak ditemukan.', 404);

$curr   = $row['status'];
$action = strInput($in, 'action');
$uid    = (int)$sess['user_id'];

// ---- Proses ----
if ($action === 'proses') {
    if ($curr !== 'sampel_diambil') jsonErr('Sampel belum diambil.', 409);
    $stmt = $conn->prepare("UPDATE permintaan_lab SET status = 'diproses' WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();
    jsonOk(['message' => 'Sampel dalam proses.']);
}

// ---- Tolak ----
if ($action === 'tolak') {
    if (!in_array($curr, ['diminta','sampel_diambil','diproses'], true)) {
        jsonErr('Status tidak bisa ditolak.', 409);
    }
    $alasan = strInput($in, 'alasan');
    if ($alasan === '') jsonErr('Alasan penolakan wajib.', 422);

    $stmt = $conn->prepare(
        "UPDATE permintaan_lab
         SET status = 'ditolak', catatan = CONCAT(COALESCE(catatan,''), '\n[TOLAK] ', ?)
         WHERE id = ?"
    );
    $stmt->bind_param('si', $alasan, $id);
    $stmt->execute();
    $stmt->close();
    jsonOk(['message' => 'Permintaan lab ditolak.']);
}

// ---- Ambil sampel (default) ----
if ($curr !== 'diminta') jsonErr('Sampel sudah diambil atau status tidak valid.', 409);

$jenisSampel   = strInput($in, 'jenis_sampel', 'darah');
$catatanSampel = strInput($in, 'catatan_sampel');

if (!in_array($jenisSampel, ['darah','urin','feses','swab','sputum','lain'], true)) {
    $jenisSampel = 'darah';
}

$bindUid = $uid;
$stmt = $conn->prepare(
    "UPDATE permintaan_lab
     SET status = 'sampel_diambil',
         jenis_sampel = ?,
         sampel_diambil_at = NOW(),
         sampel_diambil_by = ?,
         catatan_sampel = ?
     WHERE id = ?"
);
$stmt->bind_param('sisi', $jenisSampel, $bindUid, $catatanSampel, $id);
$stmt->execute();
$stmt->close();

jsonOk(['message' => 'Sampel dicatat.']);