<?php
/**
 * CRUD tindakan medis dan tindakan keperawatan.
 *
 * GET:
 *   ?tipe=medis&rekam_medis_id=X
 *   ?tipe=keperawatan&pemeriksaan_awal_id=X
 *
 * POST:
 *   { tipe, rekam_medis_id, nama_tindakan, keterangan?, biaya? }
 *   { tipe, pemeriksaan_awal_id, nama_tindakan, keterangan? }
 *
 * DELETE:
 *   { tipe, id }
 *
 * Akses:
 *   Dokter  : medis
 *   Perawat : keperawatan
 *   Admin   : keduanya
 */
declare(strict_types=1);

require __DIR__ . '/koneksi.php';
require __DIR__ . '/helper.php';

$sess = requireRole(['dokter', 'perawat', 'admin']);

$role   = $sess['role'];
$method = $_SERVER['REQUEST_METHOD'];

// =========================================================
// VALIDASI AKSES BERDASARKAN TIPE
// =========================================================
function assertTipeAccess(string $tipe, string $role): void
{
    if (!in_array($tipe, ['medis', 'keperawatan'], true)) {
        jsonErr('Tipe tindakan tidak valid.', 422);
    }

    if ($role === 'admin') {
        return;
    }

    if (
        ($tipe === 'medis' && $role !== 'dokter') ||
        ($tipe === 'keperawatan' && $role !== 'perawat')
    ) {
        jsonErr('Anda tidak memiliki akses.', 403);
    }
}

// =========================================================
// CEK STATUS REKAM MEDIS
// =========================================================
function assertRmDraft(
    mysqli $conn,
    int $rmId,
    array $sess
): void {

    $stmt = $conn->prepare(
        'SELECT status
         FROM rekam_medis
         WHERE id = ?
         LIMIT 1'
    );

    $stmt->bind_param('i', $rmId);
    $stmt->execute();

    $rm = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$rm) {
        jsonErr('Rekam medis tidak ditemukan.', 404);
    }

    if (
        $rm['status'] === 'selesai' &&
        $sess['role'] !== 'admin'
    ) {
        jsonErr('Rekam medis sudah selesai.', 403);
    }
}

// =========================================================
// CEK STATUS PEMERIKSAAN AWAL
// =========================================================
function assertPaDraft(
    mysqli $conn,
    int $paId,
    array $sess
): void {

    $stmt = $conn->prepare(
        'SELECT status
         FROM pemeriksaan_awal
         WHERE id = ?
         LIMIT 1'
    );

    $stmt->bind_param('i', $paId);
    $stmt->execute();

    $pa = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$pa) {
        jsonErr('Pemeriksaan tidak ditemukan.', 404);
    }

    if (
        $pa['status'] === 'selesai' &&
        $sess['role'] !== 'admin'
    ) {
        jsonErr(
            'Pemeriksaan sudah selesai, tindakan tidak bisa diubah.',
            403
        );
    }
}

// =========================================================
// GET: DAFTAR TINDAKAN
// =========================================================
if ($method === 'GET') {

    $tipe = trim((string)($_GET['tipe'] ?? ''));

    assertTipeAccess($tipe, $role);

    // -----------------------------------------------------
    // TINDAKAN MEDIS
    // -----------------------------------------------------
    if ($tipe === 'medis') {

        $rmId = (int)($_GET['rekam_medis_id'] ?? 0);

        if ($rmId <= 0) {
            jsonErr('rekam_medis_id wajib diisi.', 422);
        }

        $stmt = $conn->prepare(
            'SELECT
                id,
                nama_tindakan,
                keterangan,
                biaya,
                waktu
             FROM tindakan_medis
             WHERE rekam_medis_id = ?
             ORDER BY waktu ASC'
        );

        $stmt->bind_param('i', $rmId);
    }

    // -----------------------------------------------------
    // TINDAKAN KEPERAWATAN
    // -----------------------------------------------------
    else {

        $paId = (int)($_GET['pemeriksaan_awal_id'] ?? 0);

        if ($paId <= 0) {
            jsonErr('pemeriksaan_awal_id wajib diisi.', 422);
        }

        $stmt = $conn->prepare(
            'SELECT
                id,
                nama_tindakan,
                keterangan,
                waktu
             FROM tindakan_keperawatan
             WHERE pemeriksaan_awal_id = ?
             ORDER BY waktu ASC'
        );

        $stmt->bind_param('i', $paId);
    }

    $stmt->execute();

    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    $stmt->close();

    jsonOk(['data' => $rows]);
}

// =========================================================
// POST: TAMBAH TINDAKAN
// =========================================================
if ($method === 'POST') {

    $in = jsonInput();

    $tipe = trim((string)($in['tipe'] ?? ''));

    assertTipeAccess($tipe, $role);

    $nama = strInput($in, 'nama_tindakan');
    $ket  = strInput($in, 'keterangan');

    if ($nama === '') {
        jsonErr('nama_tindakan wajib diisi.', 422);
    }

    // -----------------------------------------------------
    // TAMBAH TINDAKAN MEDIS
    // -----------------------------------------------------
    if ($tipe === 'medis') {

        $rmId  = (int)($in['rekam_medis_id'] ?? 0);
        $biaya = (float)($in['biaya'] ?? 0);

        if ($rmId <= 0 || $biaya < 0) {
            jsonErr('Data tindakan tidak valid.', 422);
        }

        assertRmDraft($conn, $rmId, $sess);

        $stmt = $conn->prepare(
            'INSERT INTO tindakan_medis (
                rekam_medis_id,
                nama_tindakan,
                keterangan,
                biaya
             ) VALUES (?, ?, ?, ?)'
        );

        $stmt->bind_param(
            'issd',
            $rmId,
            $nama,
            $ket,
            $biaya
        );
    }

    // -----------------------------------------------------
    // TAMBAH TINDAKAN KEPERAWATAN
    // -----------------------------------------------------
    else {

        $paId = (int)($in['pemeriksaan_awal_id'] ?? 0);

        if ($paId <= 0) {
            jsonErr('pemeriksaan_awal_id wajib diisi.', 422);
        }

        assertPaDraft($conn, $paId, $sess);

        $stmt = $conn->prepare(
            'INSERT INTO tindakan_keperawatan (
                pemeriksaan_awal_id,
                nama_tindakan,
                keterangan
             ) VALUES (?, ?, ?)'
        );

        $stmt->bind_param(
            'iss',
            $paId,
            $nama,
            $ket
        );
    }

    $stmt->execute();

    $id = $stmt->insert_id;

    $stmt->close();

    jsonOk([
        'message' => 'Tindakan ditambahkan.',
        'id'      => $id,
    ]);
}

// =========================================================
// DELETE: HAPUS TINDAKAN
// =========================================================
if ($method === 'DELETE') {

    $in = jsonInput();

    $tipe = trim((string)($in['tipe'] ?? ''));

    assertTipeAccess($tipe, $role);

    $id = (int)($in['id'] ?? 0);

    if ($id <= 0) {
        jsonErr('ID wajib diisi.', 422);
    }

    // -----------------------------------------------------
    // HAPUS TINDAKAN MEDIS
    // -----------------------------------------------------
    if ($tipe === 'medis') {

        $stmt = $conn->prepare(
            'SELECT rekam_medis_id
             FROM tindakan_medis
             WHERE id = ?
             LIMIT 1'
        );

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        $stmt->close();

        if (!$row) {
            jsonErr('Tindakan tidak ditemukan.', 404);
        }

        assertRmDraft(
            $conn,
            (int)$row['rekam_medis_id'],
            $sess
        );

        $stmt = $conn->prepare(
            'DELETE FROM tindakan_medis
             WHERE id = ?'
        );
    }

    // -----------------------------------------------------
    // HAPUS TINDAKAN KEPERAWATAN
    // -----------------------------------------------------
    else {

        $stmt = $conn->prepare(
            'SELECT pemeriksaan_awal_id
             FROM tindakan_keperawatan
             WHERE id = ?
             LIMIT 1'
        );

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $row = $stmt->get_result()->fetch_assoc();

        $stmt->close();

        if (!$row) {
            jsonErr('Tindakan tidak ditemukan.', 404);
        }

        assertPaDraft(
            $conn,
            (int)$row['pemeriksaan_awal_id'],
            $sess
        );

        $stmt = $conn->prepare(
            'DELETE FROM tindakan_keperawatan
             WHERE id = ?'
        );
    }

    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();

    jsonOk([
        'message' => 'Tindakan dihapus.',
    ]);
}

// =========================================================
// METHOD TIDAK DIIZINKAN
// =========================================================
jsonErr('Method tidak diizinkan.', 405);
