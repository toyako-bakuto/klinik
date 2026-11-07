<?php
declare(strict_types=1);

require __DIR__ . '/koneksi.php';
require __DIR__ . '/helper.php';

$sess  = requireRole(['admin', 'resepsionis', 'perawat', 'dokter']);
$role  = $sess['role'];
$method = $_SERVER['REQUEST_METHOD'];

// =========================================================
// GET: DAFTAR ANTREAN
// =========================================================
if ($method === 'GET') {

    $tanggal = trim((string)($_GET['tanggal'] ?? date('Y-m-d')));

    // -----------------------------------------------------
    // ANTREAN DOKTER
    // -----------------------------------------------------
    if (in_array($role, ['dokter', 'admin'], true) &&
        ($role === 'dokter' || ($_GET['tipe'] ?? '') === 'dokter')) {

        $isAdmin = $role === 'admin';
        $dokterId = null;

        // Dokter hanya melihat pasien miliknya
        if (!$isAdmin) {

            $stmt = $conn->prepare(
                'SELECT id FROM dokter
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
        }

        $sql = "
            SELECT
                p.id AS pendaftaran_id,
                p.no_reg,
                p.tanggal,
                p.status AS status_pendaftaran,

                ps.no_rm,
                ps.nama AS pasien_nama,
                ps.jenis_kelamin,
                ps.tanggal_lahir,

                d.nama AS dokter_nama,
                d.spesialis,

                a.no_antrean,

                pa.id AS pa_id,
                pa.status AS pa_status,
                pa.suhu,
                pa.sistolik,
                pa.diastolik,
                pa.nadi,
                pa.pernapasan,
                pa.saturasi_oksigen,
                pa.keluhan AS pa_keluhan,

                rm.id AS rm_id,
                rm.status AS rm_status

            FROM pendaftaran p

            JOIN pasien ps
                ON ps.id = p.pasien_id

            JOIN dokter d
                ON d.id = p.dokter_id

            LEFT JOIN antrean a
                ON a.pendaftaran_id = p.id

            LEFT JOIN pemeriksaan_awal pa
                ON pa.pendaftaran_id = p.id

            LEFT JOIN rekam_medis rm
                ON rm.pendaftaran_id = p.id

            WHERE p.tanggal = ?
              AND p.status IN (
                  'menunggu_dokter',
                  'diperiksa',
                  'menunggu_lab'
              )
        ";

        $types = 's';
        $params = [$tanggal];

        if ($dokterId !== null) {
            $sql .= ' AND p.dokter_id = ?';
            $types .= 'i';
            $params[] = $dokterId;
        }

        $sql .= "
            ORDER BY
                FIELD(
                    p.status,
                    'menunggu_dokter',
                    'diperiksa',
                    'menunggu_lab'
                ),
                a.no_antrean ASC,
                p.created_at ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();

        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        jsonOk(['data' => $rows]);
    }

    // -----------------------------------------------------
    // ANTREAN PERAWAT
    // -----------------------------------------------------
    if ($role === 'perawat') {

        $stmt = $conn->prepare(
            "SELECT
                p.id AS pendaftaran_id,
                p.no_reg,
                p.tanggal,
                p.keluhan AS keluhan_daftar,
                p.status AS status_pendaftaran,

                ps.no_rm,
                ps.nama AS pasien_nama,
                ps.jenis_kelamin,
                ps.tanggal_lahir,

                d.nama AS dokter_nama,
                d.spesialis,

                a.no_antrean,

                pa.id AS pa_id,
                pa.status AS pa_status

            FROM pendaftaran p

            JOIN pasien ps
                ON ps.id = p.pasien_id

            JOIN dokter d
                ON d.id = p.dokter_id

            LEFT JOIN antrean a
                ON a.pendaftaran_id = p.id

            LEFT JOIN pemeriksaan_awal pa
                ON pa.pendaftaran_id = p.id

            WHERE p.tanggal = ?
              AND (
                  p.status IN ('menunggu', 'menunggu_dokter')
                  OR pa.status = 'draft'
              )

            ORDER BY
                (pa.status = 'draft') DESC,
                a.no_antrean ASC,
                p.created_at ASC"
        );

        $stmt->bind_param('s', $tanggal);
        $stmt->execute();

        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        jsonOk(['data' => $rows]);
    }

    // -----------------------------------------------------
    // ANTREAN ADMIN DAN RESEPSIONIS
    // -----------------------------------------------------
    if (in_array($role, ['admin', 'resepsionis'], true)) {

        $stmt = $conn->prepare(
            "SELECT
                a.id,
                a.no_antrean,
                a.estimasi,
                a.status,

                p.no_reg,
                p.tanggal,

                ps.nama AS pasien_nama,
                ps.no_rm,

                d.nama AS dokter_nama,
                d.spesialis

            FROM antrean a

            JOIN pendaftaran p
                ON p.id = a.pendaftaran_id

            JOIN pasien ps
                ON ps.id = p.pasien_id

            JOIN dokter d
                ON d.id = p.dokter_id

            WHERE p.tanggal = ?

            ORDER BY a.no_antrean ASC"
        );

        $stmt->bind_param('s', $tanggal);
        $stmt->execute();

        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        jsonOk(['data' => $rows]);
    }

    jsonErr('Akses tidak diizinkan.', 403);
}

// =========================================================
// PUT: UPDATE STATUS ANTREAN
// HANYA ADMIN DAN RESEPSIONIS
// =========================================================
if ($method === 'PUT') {

    if (!in_array($role, ['admin', 'resepsionis'], true)) {
        jsonErr('Anda tidak memiliki akses mengubah antrean.', 403);
    }

    $in     = jsonInput();
    $id     = (int)($in['id'] ?? 0);
    $status = strInput($in, 'status');

    $allowedStatus = [
        'menunggu',
        'menunggu_dokter',
        'diperiksa',
        'menunggu_lab',
        'selesai',
        'batal',
    ];

    if (
        $id <= 0 ||
        !in_array($status, $allowedStatus, true)
    ) {
        jsonErr('Data tidak valid.', 422);
    }

    // Ambil pendaftaran_id
    $stmt = $conn->prepare(
        'SELECT pendaftaran_id
         FROM antrean
         WHERE id = ?'
    );

    $stmt->bind_param('i', $id);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        jsonErr('Antrean tidak ditemukan.', 404);
    }

    $pendaftaranId = (int)$row['pendaftaran_id'];

    // Update status antrean dan pendaftaran
    $conn->begin_transaction();

    try {

        $stmt = $conn->prepare(
            'UPDATE antrean
             SET status = ?
             WHERE id = ?'
        );

        $stmt->bind_param('si', $status, $id);
        $stmt->execute();
        $stmt->close();

        $stmt = $conn->prepare(
            'UPDATE pendaftaran
             SET status = ?
             WHERE id = ?'
        );

        $stmt->bind_param('si', $status, $pendaftaranId);
        $stmt->execute();
        $stmt->close();

        $conn->commit();

    } catch (Throwable $e) {

        $conn->rollback();
        jsonErr('Gagal memperbarui status antrean.', 500);
    }

    jsonOk([
        'message' => 'Status antrean diperbarui.'
    ]);
}

// =========================================================
// METHOD TIDAK DIIZINKAN
// =========================================================
jsonErr('Method tidak diizinkan.', 405);
