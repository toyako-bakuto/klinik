<?php
/**
 * Input hasil + validasi.
 *
 * POST { id, hasil, nilai_rujukan?, kesan? }
 *   → status diproses → hasil_diinput
 *
 * PUT { id, action:'validasi' }
 *   → status hasil_diinput → divalidasi
 *   → auto refresh tagihan
 *
 * PUT { id, action:'koreksi', hasil, nilai_rujukan?, kesan? }
 *   → edit hasil (hanya sebelum divalidasi / admin)
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['lab', 'admin']);
$method = $_SERVER['REQUEST_METHOD'];
$uid    = (int)$sess['user_id'];

// =====================================================
// POST — input hasil
// =====================================================
if ($method === 'POST') {
    $in = jsonInput();
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) jsonErr('ID wajib.', 422);

    $hasil        = strInput($in, 'hasil');
    $nilaiRujukan = strInput($in, 'nilai_rujukan');
    $kesan        = strInput($in, 'kesan');

    if ($hasil === '') jsonErr('Hasil wajib diisi.', 422);

    $stmt = $conn->prepare('SELECT status FROM permintaan_lab WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) jsonErr('Permintaan lab tidak ditemukan.', 404);

    if (!in_array($row['status'], ['diproses','sampel_diambil'], true)) {
        jsonErr('Status tidak valid untuk input hasil.', 409);
    }

    $bindUid = $uid;
    $stmt = $conn->prepare(
        "UPDATE permintaan_lab
         SET hasil = ?,
             nilai_rujukan = ?,
             kesan = ?,
             status = 'hasil_diinput',
             hasil_diinput_at = NOW(),
             hasil_diinput_by = ?,
             waktu_hasil = NOW()
         WHERE id = ?"
    );
    $stmt->bind_param('sssii', $hasil, $nilaiRujukan, $kesan, $bindUid, $id);
    $stmt->execute();
    $stmt->close();

    jsonOk(['message' => 'Hasil diinput. Menunggu validasi.']);
}

// =====================================================
// PUT — validasi / koreksi
// =====================================================
if ($method === 'PUT') {
    $in = jsonInput();
    $id = (int)($in['id'] ?? 0);
    if ($id <= 0) jsonErr('ID wajib.', 422);

    $action = strInput($in, 'action');

    // ---- Validasi ----
    if ($action === 'validasi') {
        $stmt = $conn->prepare(
            'SELECT pl.status, pl.rekam_medis_id, rm.pendaftaran_id
             FROM permintaan_lab pl
             JOIN rekam_medis rm ON rm.id = pl.rekam_medis_id
             WHERE pl.id = ? LIMIT 1'
        );
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$row) jsonErr('Permintaan lab tidak ditemukan.', 404);
        if ($row['status'] !== 'hasil_diinput') {
            jsonErr('Hasil belum diinput atau sudah divalidasi.', 409);
        }

        $bindUid = $uid;
        $stmt = $conn->prepare(
            "UPDATE permintaan_lab
             SET status = 'divalidasi', divalidasi_at = NOW(), divalidasi_by = ?
             WHERE id = ?"
        );
        $stmt->bind_param('ii', $bindUid, $id);
        $stmt->execute();
        $stmt->close();

        // ✅ Refresh tagihan (lab yang sudah divalidasi masuk tagihan)
        try {
            buatTagihanOtomatis($conn, (int)$row['pendaftaran_id']);
        } catch (Throwable $e) {
            error_log('Gagal refresh tagihan (lab): ' . $e->getMessage());
        }

        jsonOk(['message' => 'Hasil divalidasi.']);
    }

    // ---- Koreksi (sebelum divalidasi / admin) ----
    if ($action === 'koreksi') {
        $stmt = $conn->prepare('SELECT status FROM permintaan_lab WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$row) jsonErr('Permintaan lab tidak ditemukan.', 404);

        if ($row['status'] === 'divalidasi' && ($sess['role'] ?? '') !== 'admin') {
            jsonErr('Hasil sudah divalidasi. Hanya admin bisa koreksi.', 403);
        }

        $hasil        = strInput($in, 'hasil');
        $nilaiRujukan = strInput($in, 'nilai_rujukan');
        $kesan        = strInput($in, 'kesan');
        if ($hasil === '') jsonErr('Hasil wajib.', 422);

        $stmt = $conn->prepare(
            'UPDATE permintaan_lab
             SET hasil = ?, nilai_rujukan = ?, kesan = ?
             WHERE id = ?'
        );
        $stmt->bind_param('sssi', $hasil, $nilaiRujukan, $kesan, $id);
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Hasil dikoreksi.']);
    }

    jsonErr('Aksi tidak dikenal.', 422);
}

jsonErr('Method tidak diizinkan.', 405);