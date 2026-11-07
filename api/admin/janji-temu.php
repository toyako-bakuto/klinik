<?php
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['admin', 'resepsionis']);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // =====================================================
    // GET — list janji temu
    // Query params (opsional): ?tanggal=YYYY-MM-DD&status=...
    // =====================================================
    case 'GET':
        $tanggal = trim((string)($_GET['tanggal'] ?? ''));
        $status  = trim((string)($_GET['status']  ?? ''));

        $sql = 'SELECT j.id, j.no_janji, j.tanggal, j.jam, j.keperluan, j.status,
                       ps.id AS pasien_id, ps.no_rm, ps.nama AS pasien_nama,
                       d.id  AS dokter_id, d.nama AS dokter_nama, d.spesialis
                FROM janji_temu j
                JOIN pasien ps ON ps.id = j.pasien_id
                JOIN dokter d  ON d.id  = j.dokter_id
                WHERE 1=1';
        $types = '';
        $params = [];

        if ($tanggal !== '') {
            $sql .= ' AND j.tanggal = ?';
            $types .= 's';
            $params[] = $tanggal;
        }
        if (in_array($status, ['dijadwalkan','dikonfirmasi','dibatalkan','selesai'], true)) {
            $sql .= ' AND j.status = ?';
            $types .= 's';
            $params[] = $status;
        }
        $sql .= ' ORDER BY j.tanggal ASC, j.jam ASC LIMIT 200';

        $stmt = $conn->prepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        jsonOk(['data' => $rows]);
        break;

    // =====================================================
    // POST — buat janji temu
    // =====================================================
    case 'POST':
        $in = jsonInput();

        $pasien_id = (int)($in['pasien_id'] ?? 0);
        $dokter_id = (int)($in['dokter_id'] ?? 0);
        $tanggal   = strInput($in, 'tanggal');
        $jam       = strInput($in, 'jam');
        $keperluan = strInput($in, 'keperluan');

        if ($pasien_id <= 0 || $dokter_id <= 0 || $tanggal === '' || $jam === '') {
            jsonErr('Pasien, dokter, tanggal, dan jam wajib diisi.', 422);
        }

        // Validasi format tanggal & jam
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tanggal)) {
            jsonErr('Format tanggal tidak valid.', 422);
        }
        if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $jam)) {
            jsonErr('Format jam tidak valid.', 422);
        }

        // Cegah bentrok: dokter sama, tanggal sama, jam sama, status belum batal
        $stmt = $conn->prepare(
            "SELECT COUNT(*) AS c FROM janji_temu
             WHERE dokter_id = ? AND tanggal = ? AND jam = ?
             AND status IN ('dijadwalkan','dikonfirmasi')"
        );
        $stmt->bind_param('iss', $dokter_id, $tanggal, $jam);
        $stmt->execute();
        $bentrok = (int)$stmt->get_result()->fetch_assoc()['c'];
        $stmt->close();

        if ($bentrok > 0) {
            jsonErr('Dokter sudah memiliki janji pada tanggal & jam tersebut.', 409);
        }

        // Generate no_janji: JTM-YYYYMMDD-XXX
        $prefix = 'JTM-' . date('Ymd', strtotime($tanggal)) . '-';
        $stmt = $conn->prepare(
            "SELECT COUNT(*) AS c FROM janji_temu WHERE no_janji LIKE CONCAT(?, '%')"
        );
        $stmt->bind_param('s', $prefix);
        $stmt->execute();
        $count = (int)$stmt->get_result()->fetch_assoc()['c'];
        $stmt->close();
        $no_janji = $prefix . str_pad((string)($count + 1), 3, '0', STR_PAD_LEFT);

        $createdBy = (int)$sess['user_id'];
        $stmt = $conn->prepare(
            'INSERT INTO janji_temu
             (no_janji, pasien_id, dokter_id, tanggal, jam, keperluan, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, "dijadwalkan", ?)'
        );
        $stmt->bind_param('sissssi',
            $no_janji, $pasien_id, $dokter_id, $tanggal, $jam, $keperluan, $createdBy
        );
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();

        jsonOk([
            'message'  => 'Janji temu dibuat.',
            'id'       => $id,
            'no_janji' => $no_janji,
        ]);
        break;

    // =====================================================
    // PUT — ubah status atau jadwal
    // Body: { id, status? , tanggal?, jam?, keperluan? }
    // =====================================================
    case 'PUT':
        $in = jsonInput();
        $id = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID tidak valid.', 422);

        // Ambil data lama
        $stmt = $conn->prepare('SELECT * FROM janji_temu WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $old = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$old) jsonErr('Janji temu tidak ditemukan.', 404);

        $status    = strInput($in, 'status',    $old['status']);
        $tanggal   = strInput($in, 'tanggal',   $old['tanggal']);
        $jam       = strInput($in, 'jam',       $old['jam']);
        $keperluan = array_key_exists('keperluan', $in)
                        ? trim((string)$in['keperluan'])
                        : $old['keperluan'];

        $validStatus = ['dijadwalkan','dikonfirmasi','dibatalkan','selesai'];
        if (!in_array($status, $validStatus, true)) {
            jsonErr('Status tidak valid.', 422);
        }

        $stmt = $conn->prepare(
            'UPDATE janji_temu
             SET status = ?, tanggal = ?, jam = ?, keperluan = ?
             WHERE id = ?'
        );
        $stmt->bind_param('ssssi', $status, $tanggal, $jam, $keperluan, $id);
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Janji temu diperbarui.']);
        break;

    // =====================================================
    // DELETE — hapus permanen
    // =====================================================
    case 'DELETE':
        $in = jsonInput();
        $id = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID tidak valid.', 422);

        $stmt = $conn->prepare('DELETE FROM janji_temu WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Janji temu dihapus.']);
        break;

    default:
        jsonErr('Method tidak diizinkan.', 405);
}