<?php
/**
 * Tagihan kasir.
 *
 * GET  ?action=cari&q=...      → cari pendaftaran untuk pembayaran
 * GET  ?pendaftaran_id=X       → detail tagihan (live atau snapshot)
 * GET  ?status=...             → list tagihan
 * POST { pendaftaran_id }      → buat / snapshot tagihan
 * PUT  { pendaftaran_id }      → hitung ulang (refresh) tagihan belum bayar
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['kasir', 'admin']);
$method = $_SERVER['REQUEST_METHOD'];

// =========================================================
// GET ?action=cari  → cari pendaftaran
// =========================================================
if ($method === 'GET' && ($_GET['action'] ?? '') === 'cari') {
    $q = trim((string)($_GET['q'] ?? ''));
    if (strlen($q) < 2) {
        jsonOk(['data' => []]);
    }

    $like = '%' . $q . '%';
    $stmt = $conn->prepare(
        "SELECT p.id AS pendaftaran_id, p.no_reg, p.tanggal, p.status AS status_pendaftaran,
                ps.no_rm, ps.nama AS pasien_nama,
                d.nama AS dokter_nama, d.spesialis,
                t.id AS tagihan_id, t.no_tagihan, t.status AS status_tagihan, t.total
         FROM pendaftaran p
         JOIN pasien ps ON ps.id = p.pasien_id
         JOIN dokter d  ON d.id = p.dokter_id
         LEFT JOIN tagihan t ON t.pendaftaran_id = p.id
         WHERE (ps.nama LIKE ? OR ps.no_rm LIKE ? OR p.no_reg LIKE ?)
           AND p.status IN ('diperiksa','menunggu_lab','selesai')
         ORDER BY p.tanggal DESC, p.created_at DESC
         LIMIT 20"
    );
    $stmt->bind_param('sss', $like, $like, $like);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jsonOk(['data' => $rows]);
}

switch ($method) {

    // =====================================================
    // GET — detail / list
    // =====================================================
    case 'GET':
        if (!empty($_GET['pendaftaran_id'])) {
            $pid = (int)$_GET['pendaftaran_id'];

            $stmt = $conn->prepare(
                "SELECT p.id, p.no_reg, p.tanggal, p.status AS status_pendaftaran,
                        ps.id AS pasien_id, ps.no_rm, ps.nama AS pasien_nama,
                        ps.jenis_kelamin, ps.alamat, ps.telepon,
                        d.nama AS dokter_nama, d.spesialis, d.tarif_konsultasi
                 FROM pendaftaran p
                 JOIN pasien ps ON ps.id = p.pasien_id
                 JOIN dokter d  ON d.id = p.dokter_id
                 WHERE p.id = ? LIMIT 1"
            );
            $stmt->bind_param('i', $pid);
            $stmt->execute();
            $pendaftaran = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$pendaftaran) jsonErr('Pendaftaran tidak ditemukan.', 404);

            $stmt = $conn->prepare('SELECT * FROM tagihan WHERE pendaftaran_id = ? LIMIT 1');
            $stmt->bind_param('i', $pid);
            $stmt->execute();
            $tagihan = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            $items = [];
            $pembayaranList = [];
            if ($tagihan) {
                $stmt = $conn->prepare(
                    'SELECT * FROM tagihan_item WHERE tagihan_id = ? ORDER BY id ASC'
                );
                $stmt->bind_param('i', $tagihan['id']);
                $stmt->execute();
                $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmt->close();

                $stmt = $conn->prepare(
                    'SELECT pb.*, u.nama_lengkap AS kasir_nama
                     FROM pembayaran pb
                     LEFT JOIN users u ON u.id = pb.created_by
                     WHERE pb.tagihan_id = ?
                     ORDER BY pb.created_at ASC'
                );
                $stmt->bind_param('i', $tagihan['id']);
                $stmt->execute();
                $pembayaranList = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmt->close();
            }

            $liveItems = $tagihan ? [] : hitungTagihanLive($conn, $pid);

            jsonOk([
                'pendaftaran' => $pendaftaran,
                'tagihan'     => $tagihan,
                'items'       => $items,
                'pembayaran'  => $pembayaranList,
                'live_items'  => $liveItems,
            ]);
        }

        // List tagihan
        $status = trim((string)($_GET['status'] ?? ''));
        $dari   = trim((string)($_GET['dari']   ?? ''));
        $sampai = trim((string)($_GET['sampai'] ?? ''));
        $q      = trim((string)($_GET['q']      ?? ''));

        $sql = "SELECT t.id, t.no_tagihan, t.total, t.total_bayar, t.status,
                       t.created_at,
                       p.tanggal, p.no_reg,
                       ps.no_rm, ps.nama AS pasien_nama,
                       d.nama AS dokter_nama
                FROM tagihan t
                JOIN pendaftaran p ON p.id = t.pendaftaran_id
                JOIN pasien ps     ON ps.id = t.pasien_id
                JOIN dokter d      ON d.id = p.dokter_id
                WHERE 1=1";
        $types = ''; $params = [];

        if (in_array($status, ['belum_bayar','sebagian','lunas','dibatalkan'], true)) {
            $sql .= ' AND t.status = ?';
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
            $sql .= ' AND (ps.nama LIKE ? OR ps.no_rm LIKE ? OR p.no_reg LIKE ? OR t.no_tagihan LIKE ?)';
            $types .= 'ssss';
            $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $like;
        }
        $sql .= ' ORDER BY t.created_at DESC LIMIT 200';

        $stmt = $conn->prepare($sql);
        if ($types !== '') $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        jsonOk(['data' => $rows]);
        break;

    // =====================================================
    // POST — buat tagihan manual (snapshot)
    // =====================================================
    case 'POST':
        $in  = jsonInput();
        $pid = (int)($in['pendaftaran_id'] ?? 0);
        if ($pid <= 0) jsonErr('pendaftaran_id wajib.', 422);

        $tagihanId = buatTagihanOtomatis($conn, $pid);
        if ($tagihanId <= 0) {
            jsonErr('Tidak ada item yang bisa ditagih untuk kunjungan ini.', 422);
        }

        $stmt = $conn->prepare('SELECT no_tagihan, total FROM tagihan WHERE id = ?');
        $stmt->bind_param('i', $tagihanId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        jsonOk([
            'message'    => 'Tagihan dibuat.',
            'id'         => $tagihanId,
            'no_tagihan' => $row['no_tagihan'] ?? null,
            'total'      => $row['total'] ?? 0,
        ]);
        break;

    // =====================================================
    // PUT — hitung ulang (refresh) tagihan
    // =====================================================
    case 'PUT':
        $in  = jsonInput();
        $pid = (int)($in['pendaftaran_id'] ?? 0);
        if ($pid <= 0) jsonErr('pendaftaran_id wajib.', 422);

        $stmt = $conn->prepare('SELECT id, status FROM tagihan WHERE pendaftaran_id = ? LIMIT 1');
        $stmt->bind_param('i', $pid);
        $stmt->execute();
        $t = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$t) jsonErr('Tagihan belum dibuat. Gunakan POST.', 404);
        if ($t['status'] !== 'belum_bayar') {
            jsonErr('Hanya tagihan belum bayar yang bisa dihitung ulang.', 409);
        }

        $tagihanId = buatTagihanOtomatis($conn, $pid);
        if ($tagihanId <= 0) jsonErr('Gagal menghitung ulang tagihan.', 500);

        jsonOk(['message' => 'Tagihan diperbarui.', 'id' => $tagihanId]);
        break;

    default:
        jsonErr('Method tidak diizinkan.', 405);
}