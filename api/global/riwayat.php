<?php
/**
 * Riwayat seluruh portal.
 *
 * GET ?tipe=dokter&dari=&sampai=&q=
 * GET ?tipe=perawat&dari=&sampai=&q=
 * GET ?tipe=lab&dari=&sampai=&q=&status=
 * GET ?tipe=apoteker&dari=&sampai=&q=&status=
 * GET ?tipe=kasir&dari=&sampai=&q=&status=
 *
 * Dokter  : riwayat rekam medis miliknya.
 * Perawat : riwayat pemeriksaan keperawatan.
 * Lab     : riwayat laboratorium.
 * Apoteker: resep diserahkan / ditolak.
 * Kasir   : riwayat transaksi pembayaran.
 * Admin   : semua jenis riwayat.
 */
declare(strict_types=1);

require __DIR__ . '/koneksi.php';
require __DIR__ . '/helper.php';

$sess = requireRole([
    'admin',
    'dokter',
    'perawat',
    'lab',
    'apoteker',
    'kasir',
]);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonErr('Method tidak diizinkan.', 405);
}

// =========================================================
// PARAMETER
// =========================================================

$role   = $sess['role'];
$tipe   = trim((string)($_GET['tipe'] ?? ''));
$dari   = trim((string)($_GET['dari'] ?? ''));
$sampai = trim((string)($_GET['sampai'] ?? ''));
$q      = trim((string)($_GET['q'] ?? ''));
$status = trim((string)($_GET['status'] ?? ''));

// =========================================================
// VALIDASI TIPE DAN AKSES
// =========================================================

$tipeDiizinkan = [
    'dokter',
    'perawat',
    'lab',
    'apoteker',
    'kasir',
];

if (!in_array($tipe, $tipeDiizinkan, true)) {
    jsonErr('Tipe riwayat tidak valid.', 422);
}

$aksesRole = [
    'dokter'   => 'dokter',
    'perawat'  => 'perawat',
    'lab'      => 'lab',
    'apoteker' => 'apoteker',
    'kasir'    => 'kasir',
];

if (
    $role !== 'admin'
    && $aksesRole[$tipe] !== $role
) {
    jsonErr('Anda tidak memiliki akses.', 403);
}

// =========================================================
// RIWAYAT DOKTER
// =========================================================

if ($tipe === 'dokter') {

    $dokterId = null;

    if ($role === 'dokter') {

        $stmt = $conn->prepare(
            'SELECT id
             FROM dokter
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
            rm.id,
            rm.pendaftaran_id,
            rm.diagnosis_utama,
            rm.diagnosis_kode,
            rm.diagnosis_sekunder,
            rm.status,
            rm.selesai_at,

            p.tanggal,
            p.no_reg,

            ps.no_rm,
            ps.nama AS pasien_nama,

            d.nama AS dokter_nama,
            d.spesialis

        FROM rekam_medis rm

        JOIN pendaftaran p
            ON p.id = rm.pendaftaran_id

        JOIN pasien ps
            ON ps.id = p.pasien_id

        JOIN dokter d
            ON d.id = rm.dokter_id

        WHERE 1=1
    ";

    $types = '';
    $params = [];

    if ($dokterId !== null) {
        $sql .= ' AND rm.dokter_id = ?';
        $types .= 'i';
        $params[] = $dokterId;
    }

    if ($dari !== '') {
        $sql .= ' AND p.tanggal >= ?';
        $types .= 's';
        $params[] = $dari;
    }

    if ($sampai !== '') {
        $sql .= ' AND p.tanggal <= ?';
        $types .= 's';
        $params[] = $sampai;
    }

    if ($q !== '') {
        $like = '%' . $q . '%';

        $sql .= "
            AND (
                ps.nama LIKE ?
                OR ps.no_rm LIKE ?
                OR p.no_reg LIKE ?
            )
        ";

        $types .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= "
        ORDER BY
            p.tanggal DESC,
            rm.created_at DESC
        LIMIT 200
    ";
}

// =========================================================
// RIWAYAT PERAWAT
// =========================================================

elseif ($tipe === 'perawat') {

    $sql = "
        SELECT
            pa.id,
            pa.pendaftaran_id,
            pa.status,

            pa.suhu,
            pa.sistolik,
            pa.diastolik,
            pa.nadi,
            pa.pernapasan,
            pa.saturasi_oksigen,
            pa.berat_badan,
            pa.tinggi_badan,

            pa.keluhan,
            pa.anamnesis,
            pa.catatan,

            pa.created_at,
            pa.selesai_at,

            p.tanggal,
            p.no_reg,

            ps.no_rm,
            ps.nama AS pasien_nama,

            d.nama AS dokter_nama,
            d.spesialis,

            u.nama_lengkap AS perawat_nama

        FROM pemeriksaan_awal pa

        JOIN pendaftaran p
            ON p.id = pa.pendaftaran_id

        JOIN pasien ps
            ON ps.id = p.pasien_id

        JOIN dokter d
            ON d.id = p.dokter_id

        JOIN users u
            ON u.id = pa.perawat_id

        WHERE 1=1
    ";

    $types = '';
    $params = [];

    if ($dari !== '') {
        $sql .= ' AND p.tanggal >= ?';
        $types .= 's';
        $params[] = $dari;
    }

    if ($sampai !== '') {
        $sql .= ' AND p.tanggal <= ?';
        $types .= 's';
        $params[] = $sampai;
    }

    if ($q !== '') {
        $like = '%' . $q . '%';

        $sql .= "
            AND (
                ps.nama LIKE ?
                OR ps.no_rm LIKE ?
                OR p.no_reg LIKE ?
            )
        ";

        $types .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= "
        ORDER BY
            p.tanggal DESC,
            pa.created_at DESC
        LIMIT 200
    ";
}

// =========================================================
// RIWAYAT LAB
// =========================================================

elseif ($tipe === 'lab') {

    $sql = "
        SELECT
            pl.id,
            pl.nama_lab,
            pl.jenis_sampel,
            pl.status,

            pl.hasil,
            pl.nilai_rujukan,
            pl.kesan,

            pl.waktu_diminta,
            pl.divalidasi_at,

            p.tanggal,
            p.no_reg,

            ps.no_rm,
            ps.nama AS pasien_nama,

            d.nama AS dokter_nama,

            u_valid.nama_lengkap AS valid_oleh

        FROM permintaan_lab pl

        JOIN rekam_medis rm
            ON rm.id = pl.rekam_medis_id

        JOIN pendaftaran p
            ON p.id = rm.pendaftaran_id

        JOIN pasien ps
            ON ps.id = p.pasien_id

        JOIN dokter d
            ON d.id = rm.dokter_id

        LEFT JOIN users u_valid
            ON u_valid.id = pl.divalidasi_by

        WHERE pl.status IN ('divalidasi', 'ditolak')
    ";

    $types = '';
    $params = [];

    if ($dari !== '') {
        $sql .= ' AND p.tanggal >= ?';
        $types .= 's';
        $params[] = $dari;
    }

    if ($sampai !== '') {
        $sql .= ' AND p.tanggal <= ?';
        $types .= 's';
        $params[] = $sampai;
    }

    if ($q !== '') {
        $like = '%' . $q . '%';

        $sql .= "
            AND (
                ps.nama LIKE ?
                OR ps.no_rm LIKE ?
                OR pl.nama_lab LIKE ?
            )
        ";

        $types .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    if (in_array($status, ['divalidasi', 'ditolak'], true)) {
        $sql .= ' AND pl.status = ?';
        $types .= 's';
        $params[] = $status;
    }

    $sql .= "
        ORDER BY
            COALESCE(pl.divalidasi_at, pl.waktu_diminta) DESC
        LIMIT 200
    ";
}

// =========================================================
// RIWAYAT APOTEKER
// =========================================================

elseif ($tipe === 'apoteker') {

    $sql = "
        SELECT
            r.id,
            r.status,
            r.created_at,
            r.diserahkan_at,
            r.verified_at,
            r.catatan_verifikasi,
            r.edukasi,

            p.tanggal,
            p.no_reg,

            ps.no_rm,
            ps.nama AS pasien_nama,

            d.nama AS dokter_nama,

            (
                SELECT COUNT(*)
                FROM resep_item ri
                WHERE ri.resep_id = r.id
            ) AS jml_item,

            us.nama_lengkap AS diserahkan_nama

        FROM resep r

        JOIN rekam_medis rm
            ON rm.id = r.rekam_medis_id

        JOIN pendaftaran p
            ON p.id = rm.pendaftaran_id

        JOIN pasien ps
            ON ps.id = p.pasien_id

        JOIN dokter d
            ON d.id = rm.dokter_id

        LEFT JOIN users us
            ON us.id = r.diserahkan_by

        WHERE r.status IN ('diserahkan', 'ditolak')
    ";

    $types = '';
    $params = [];

    if ($dari !== '') {
        $sql .= ' AND p.tanggal >= ?';
        $types .= 's';
        $params[] = $dari;
    }

    if ($sampai !== '') {
        $sql .= ' AND p.tanggal <= ?';
        $types .= 's';
        $params[] = $sampai;
    }

    if ($q !== '') {
        $like = '%' . $q . '%';

        $sql .= "
            AND (
                ps.nama LIKE ?
                OR ps.no_rm LIKE ?
                OR p.no_reg LIKE ?
            )
        ";

        $types .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    if (in_array($status, ['diserahkan', 'ditolak'], true)) {
        $sql .= ' AND r.status = ?';
        $types .= 's';
        $params[] = $status;
    }

    $sql .= "
        ORDER BY
            COALESCE(r.diserahkan_at, r.verified_at) DESC
        LIMIT 200
    ";
}

// =========================================================
// RIWAYAT KASIR
// =========================================================

elseif ($tipe === 'kasir') {

    $sql = "
        SELECT
            t.id,
            t.no_tagihan,
            t.total,
            t.total_bayar,
            t.status,
            t.created_at,
            t.updated_at,

            p.tanggal,
            p.no_reg,

            ps.no_rm,
            ps.nama AS pasien_nama,

            d.nama AS dokter_nama,

            (
                SELECT COUNT(*)
                FROM pembayaran pb
                WHERE pb.tagihan_id = t.id
                  AND pb.void = 0
            ) AS jml_bayar

        FROM tagihan t

        JOIN pendaftaran p
            ON p.id = t.pendaftaran_id

        JOIN pasien ps
            ON ps.id = t.pasien_id

        JOIN dokter d
            ON d.id = p.dokter_id

        WHERE t.status <> 'dibatalkan'
    ";

    $types = '';
    $params = [];

    if ($dari !== '') {
        $sql .= ' AND DATE(t.created_at) >= ?';
        $types .= 's';
        $params[] = $dari;
    }

    if ($sampai !== '') {
        $sql .= ' AND DATE(t.created_at) <= ?';
        $types .= 's';
        $params[] = $sampai;
    }

    if (in_array($status, ['belum_bayar', 'sebagian', 'lunas'], true)) {
        $sql .= ' AND t.status = ?';
        $types .= 's';
        $params[] = $status;
    }

    if ($q !== '') {
        $like = '%' . $q . '%';

        $sql .= "
            AND (
                ps.nama LIKE ?
                OR ps.no_rm LIKE ?
                OR t.no_tagihan LIKE ?
            )
        ";

        $types .= 'sss';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= "
        ORDER BY t.created_at DESC
        LIMIT 200
    ";
}

// =========================================================
// EKSEKUSI QUERY
// =========================================================

$stmt = $conn->prepare($sql);

if ($types !== '') {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();

$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

$stmt->close();

jsonOk([
    'data' => $rows,
]);