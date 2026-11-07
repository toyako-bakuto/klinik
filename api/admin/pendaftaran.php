<?php
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['admin', 'resepsionis']);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $mode    = trim((string)($_GET['mode']    ?? ''));
        $tanggal = trim((string)($_GET['tanggal'] ?? ''));
        $dari    = trim((string)($_GET['dari']    ?? ''));
        $sampai  = trim((string)($_GET['sampai']  ?? ''));
        $q       = trim((string)($_GET['q']       ?? ''));

        $sql = 'SELECT p.id, p.no_reg, p.tanggal, p.keluhan, p.status,
                       ps.no_rm, ps.nama AS pasien_nama,
                       d.nama AS dokter_nama, d.spesialis
                FROM pendaftaran p
                JOIN pasien ps ON ps.id = p.pasien_id
                JOIN dokter d  ON d.id  = p.dokter_id
                WHERE 1=1';
        $types  = '';
        $params = [];

        if ($mode === 'riwayat') {
            // Riwayat = semua yang tanggalnya <= hari ini
            $sql .= ' AND p.tanggal <= ?';
            $types .= 's';
            $params[] = date('Y-m-d');

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
                $sql .= ' AND (ps.nama LIKE ? OR ps.no_rm LIKE ? OR p.no_reg LIKE ?)';
                $types .= 'sss';
                $params[] = $like;
                $params[] = $like;
                $params[] = $like;
            }
            $sql .= ' ORDER BY p.tanggal DESC, p.created_at DESC LIMIT 200';
        } elseif ($tanggal !== '') {
            $sql .= ' AND p.tanggal = ?';
            $types .= 's';
            $params[] = $tanggal;
            $sql .= ' ORDER BY p.created_at DESC';
        } else {
            $sql .= ' ORDER BY p.created_at DESC LIMIT 100';
        }

        $stmt = $conn->prepare($sql);
        if ($types !== '') {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        jsonOk(['data' => $rows]);
        break;

    case 'POST':
        $in = jsonInput();
        $pasien_id = (int)($in['pasien_id'] ?? 0);
        $dokter_id = (int)($in['dokter_id'] ?? 0);
        $tanggal   = strInput($in, 'tanggal');
        $keluhan   = strInput($in, 'keluhan');

        if ($pasien_id <= 0 || $dokter_id <= 0 || $tanggal === '') {
            jsonErr('Pasien, dokter, dan tanggal wajib diisi.', 422);
        }

        // Generate no_reg: REG-YYYYMMDD-XXX
        $prefix = 'REG-' . date('Ymd', strtotime($tanggal)) . '-';
        $stmt = $conn->prepare(
            "SELECT COUNT(*) AS c FROM pendaftaran WHERE no_reg LIKE CONCAT(?, '%')"
        );
        $stmt->bind_param('s', $prefix);
        $stmt->execute();
        $count = (int)$stmt->get_result()->fetch_assoc()['c'];
        $stmt->close();
        $no_reg = $prefix . str_pad((string)($count + 1), 3, '0', STR_PAD_LEFT);

        // Hitung no_antrean: A-XXX (urut per hari, semua poli)
        $stmt = $conn->prepare(
            "SELECT COUNT(*) AS c FROM pendaftaran WHERE tanggal = ?"
        );
        $stmt->bind_param('s', $tanggal);
        $stmt->execute();
        $antreanHariItu = (int)$stmt->get_result()->fetch_assoc()['c'];
        $stmt->close();
        $no_antrean = 'A-' . str_pad((string)($antreanHariItu + 1), 3, '0', STR_PAD_LEFT);

        // Insert pendaftaran
        $stmt = $conn->prepare(
            'INSERT INTO pendaftaran (no_reg, pasien_id, dokter_id, tanggal, keluhan, status, created_by)
             VALUES (?, ?, ?, ?, ?, "menunggu", ?)'
        );
        $createdBy = (int)$sess['user_id'];
        $stmt->bind_param('sisssi', $no_reg, $pasien_id, $dokter_id, $tanggal, $keluhan, $createdBy);
        $stmt->execute();
        $pendaftaran_id = $stmt->insert_id;
        $stmt->close();

        // Insert antrean
        $stmt = $conn->prepare(
            'INSERT INTO antrean (pendaftaran_id, no_antrean, status) VALUES (?, ?, "menunggu")'
        );
        $stmt->bind_param('is', $pendaftaran_id, $no_antrean);
        $stmt->execute();
        $stmt->close();

        jsonOk([
            'message'     => 'Pendaftaran berhasil.',
            'id'          => $pendaftaran_id,
            'no_reg'      => $no_reg,
            'no_antrean'  => $no_antrean,
        ]);
        break;

    case 'PUT':
        $in = jsonInput();
        $id     = (int)($in['id'] ?? 0);
        $status = strInput($in, 'status');
        if ($id <= 0 || !in_array($status, ['menunggu','menunggu_dokter','diperiksa','menunggu_lab','selesai','batal'], true)) {
            jsonErr('Data tidak valid.', 422);
        }

        $stmt = $conn->prepare('UPDATE pendaftaran SET status = ? WHERE id = ?');
        $stmt->bind_param('si', $status, $id);
        $stmt->execute();
        $stmt->close();

        // Sinkronkan status antrean
        $stmt = $conn->prepare('UPDATE antrean SET status = ? WHERE pendaftaran_id = ?');
        $stmt->bind_param('si', $status, $id);
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Status pendaftaran diperbarui.']);
        break;

    default:
        jsonErr('Method tidak diizinkan.', 405);
}