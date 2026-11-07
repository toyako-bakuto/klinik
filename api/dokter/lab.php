<?php
/**
 * Dokter — minta lab (POST) & lihat (GET).
 * Input hasil & validasi hanya di portal lab.
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['dokter', 'admin']);
$method = $_SERVER['REQUEST_METHOD'];

function assertRmDraftLab(mysqli $conn, int $rmId, array $sess): void
{
    $stmt = $conn->prepare('SELECT status FROM rekam_medis WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $rmId);
    $stmt->execute();
    $rm = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$rm) jsonErr('Rekam medis tidak ditemukan.', 404);
    if ($rm['status'] === 'selesai' && ($sess['role'] ?? '') !== 'admin') {
        jsonErr('Rekam medis sudah selesai.', 403);
    }
}

switch ($method) {
    case 'GET':
        $rmId = (int)($_GET['rekam_medis_id'] ?? 0);
        if ($rmId <= 0) jsonErr('rekam_medis_id wajib.', 422);
        $stmt = $conn->prepare(
            'SELECT * FROM permintaan_lab WHERE rekam_medis_id = ? ORDER BY waktu_diminta ASC'
        );
        $stmt->bind_param('i', $rmId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        jsonOk(['data' => $rows]);
        break;

    case 'POST':
        $in = jsonInput();
        $rmId    = (int)($in['rekam_medis_id'] ?? 0);
        $namaLab = strInput($in, 'nama_lab');
        $labId   = isset($in['lab_id']) && $in['lab_id'] !== '' ? (int)$in['lab_id'] : null;
        $catatan = strInput($in, 'catatan');

        if ($rmId <= 0 || $namaLab === '') {
            jsonErr('rekam_medis_id dan nama_lab wajib.', 422);
        }
        assertRmDraftLab($conn, $rmId, $sess);

        // Ambil jenis_sampel dari master (kalau ada)
        $jenisSampel = 'darah';
        if ($labId !== null) {
            $stmt = $conn->prepare('SELECT jenis_sampel FROM master_lab WHERE id = ?');
            $stmt->bind_param('i', $labId);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if ($row && !empty($row['jenis_sampel'])) $jenisSampel = $row['jenis_sampel'];
        }

        $stmt = $conn->prepare(
            'INSERT INTO permintaan_lab
             (rekam_medis_id, nama_lab, lab_id, jenis_sampel, catatan, status)
             VALUES (?, ?, ?, ?, ?, "diminta")'
        );
        $stmt->bind_param('isiss', $rmId, $namaLab, $labId, $jenisSampel, $catatan);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();

        jsonOk(['message' => 'Permintaan lab ditambahkan.', 'id' => $id]);
        break;

    case 'DELETE':
        $in = jsonInput();
        $id = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID wajib.', 422);

        $stmt = $conn->prepare(
            'SELECT rekam_medis_id, status FROM permintaan_lab WHERE id = ? LIMIT 1'
        );
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$row) jsonErr('Permintaan lab tidak ditemukan.', 404);

        // Hanya bisa hapus kalau belum diproses lab
        if ($row['status'] !== 'diminta') {
            jsonErr('Permintaan sudah diproses lab, tidak bisa dihapus.', 409);
        }
        assertRmDraftLab($conn, (int)$row['rekam_medis_id'], $sess);

        $stmt = $conn->prepare('DELETE FROM permintaan_lab WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Permintaan lab dihapus.']);
        break;

    default:
        jsonErr('Method tidak diizinkan.', 405);
}