<?php
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['admin', 'resepsionis']);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // ?q= opsional pencarian
        $q = trim((string)($_GET['q'] ?? ''));

        if ($q !== '') {
            $like = '%' . $q . '%';
            $stmt = $conn->prepare(
                'SELECT id, no_rm, nama, jenis_kelamin, tanggal_lahir, telepon, alamat, alergi
                 FROM pasien
                 WHERE nama LIKE ? OR no_rm LIKE ? OR telepon LIKE ?
                 ORDER BY nama ASC'
            );
            $stmt->bind_param('sss', $like, $like, $like);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        } else {
            $rows = $conn->query(
                'SELECT id, no_rm, nama, jenis_kelamin, tanggal_lahir, telepon, alamat, alergi
                 FROM pasien ORDER BY nama ASC'
            )->fetch_all(MYSQLI_ASSOC);
        }

        // Normalisasi tipe: id selalu int agar front-end tidak perlu cast
        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
        }
        unset($r);

        jsonOk(['data' => $rows]);
        break;

    case 'POST':
        $in      = jsonInput();
        $nama    = strInput($in, 'nama');
        $jk      = strInput($in, 'jenis_kelamin');
        $tgl     = strInput($in, 'tanggal_lahir');
        $telp    = strInput($in, 'telepon');
        $alamat  = strInput($in, 'alamat');
        $alergi  = strInput($in, 'alergi');

        if ($nama === '' || !in_array($jk, ['L','P'], true) || $tgl === '') {
            jsonErr('Nama, jenis kelamin, dan tanggal lahir wajib diisi.', 422);
        }

        // Generate no_rm otomatis: RM-XXX
        $row   = $conn->query("SELECT MAX(CAST(SUBSTRING(no_rm, 4) AS UNSIGNED)) AS max_id FROM pasien")->fetch_assoc();
        $next  = ((int)($row['max_id'] ?? 0)) + 1;
        $no_rm = 'RM-' . str_pad((string)$next, 3, '0', STR_PAD_LEFT);

        $stmt = $conn->prepare(
            'INSERT INTO pasien (no_rm, nama, jenis_kelamin, tanggal_lahir, telepon, alamat, alergi)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('sssssss', $no_rm, $nama, $jk, $tgl, $telp, $alamat, $alergi);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();

        jsonOk(['message' => 'Pasien ditambahkan.', 'id' => $id, 'no_rm' => $no_rm]);
        break;

    case 'PUT':
        $in     = jsonInput();
        $id     = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID tidak valid.', 422);

        $nama   = strInput($in, 'nama');
        $jk     = strInput($in, 'jenis_kelamin');
        $tgl    = strInput($in, 'tanggal_lahir');
        $telp   = strInput($in, 'telepon');
        $alamat = strInput($in, 'alamat');
        $alergi = strInput($in, 'alergi');

        if ($nama === '' || !in_array($jk, ['L','P'], true) || $tgl === '') {
            jsonErr('Nama, jenis kelamin, dan tanggal lahir wajib diisi.', 422);
        }

        $stmt = $conn->prepare(
            'UPDATE pasien
             SET nama=?, jenis_kelamin=?, tanggal_lahir=?, telepon=?, alamat=?, alergi=?
             WHERE id=?'
        );
        $stmt->bind_param('ssssssi', $nama, $jk, $tgl, $telp, $alamat, $alergi, $id);
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Data pasien diperbarui.']);
        break;

    case 'DELETE':
        $in = jsonInput();
        $id = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID tidak valid.', 422);

        $stmt = $conn->prepare('DELETE FROM pasien WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Pasien dihapus.']);
        break;

    default:
        jsonErr('Method tidak diizinkan.', 405);
}