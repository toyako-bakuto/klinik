<?php
/**
 * Daftar permintaan lab + detail.
 *
 * GET ?status=diminta|sampel_diambil|diproses|hasil_diinput|divalidasi|ditolak
 * GET ?dari=&sampai=&q=
 * GET ?id=X   → detail satu permintaan
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

requireRole(['lab', 'admin']);
if ($_SERVER['REQUEST_METHOD'] !== 'GET') jsonErr('Method tidak diizinkan.', 405);

// Detail
if (!empty($_GET['id'])) {
    $id = (int)$_GET['id'];

    $stmt = $conn->prepare(
        "SELECT pl.*,
                p.id AS pendaftaran_id, p.tanggal, p.no_reg,
                ps.no_rm, ps.nama AS pasien_nama, ps.jenis_kelamin,
                ps.tanggal_lahir, ps.alamat, ps.telepon,
                d.nama AS dokter_nama, d.spesialis,
                u_ambil.nama_lengkap AS sampel_oleh,
                u_input.nama_lengkap AS input_oleh,
                u_valid.nama_lengkap AS valid_oleh
         FROM permintaan_lab pl
         JOIN rekam_medis rm ON rm.id = pl.rekam_medis_id
         JOIN pendaftaran p  ON p.id = rm.pendaftaran_id
         JOIN pasien ps      ON ps.id = p.pasien_id
         JOIN dokter d       ON d.id = rm.dokter_id
         LEFT JOIN users u_ambil ON u_ambil.id = pl.sampel_diambil_by
         LEFT JOIN users u_input ON u_input.id = pl.hasil_diinput_by
         LEFT JOIN users u_valid ON u_valid.id = pl.divalidasi_by
         WHERE pl.id = ? LIMIT 1"
    );
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) jsonErr('Permintaan lab tidak ditemukan.', 404);

    jsonOk(['data' => $row]);
}

// List
$status = trim((string)($_GET['status'] ?? ''));
$dari   = trim((string)($_GET['dari']   ?? ''));
$sampai = trim((string)($_GET['sampai'] ?? ''));
$q      = trim((string)($_GET['q']      ?? ''));

$sql = "SELECT pl.id, pl.nama_lab, pl.jenis_sampel, pl.status,
               pl.waktu_diminta, pl.sampel_diambil_at, pl.hasil_diinput_at,
               pl.divalidasi_at, pl.catatan, pl.kesan,
               p.tanggal, p.no_reg,
               ps.no_rm, ps.nama AS pasien_nama,
               d.nama AS dokter_nama
        FROM permintaan_lab pl
        JOIN rekam_medis rm ON rm.id = pl.rekam_medis_id
        JOIN pendaftaran p  ON p.id = rm.pendaftaran_id
        JOIN pasien ps      ON ps.id = p.pasien_id
        JOIN dokter d       ON d.id = rm.dokter_id
        WHERE 1=1";
$types = ''; $params = [];

$validStatuses = ['diminta','sampel_diambil','diproses','hasil_diinput','divalidasi','ditolak'];
if (in_array($status, $validStatuses, true)) {
    $sql .= ' AND pl.status = ?';
    $types .= 's'; $params[] = $status;
}
if ($dari !== '') {
    $sql .= ' AND p.tanggal >= ?';
    $types .= 's'; $params[] = $dari;
}
if ($sampai !== '') {
    $sql .= ' AND p.tanggal <= ?';
    $types .= 's'; $params[] = $sampai;
}
if ($q !== '') {
    $like = '%' . $q . '%';
    $sql .= ' AND (ps.nama LIKE ? OR ps.no_rm LIKE ? OR pl.nama_lab LIKE ?)';
    $types .= 'sss';
    $params[] = $like; $params[] = $like; $params[] = $like;
}
$sql .= ' ORDER BY pl.waktu_diminta DESC LIMIT 200';

$stmt = $conn->prepare($sql);
if ($types !== '') $stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

jsonOk(['data' => $rows]);