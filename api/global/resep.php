<?php
/**
 * Endpoint resep klinik (dokter + apoteker).
 *
 * DOKTER / ADMIN:
 * GET    ?rekam_medis_id=X
 * POST   { rekam_medis_id, catatan? }
 * POST   { rekam_medis_id, obat_id?, nama_obat, dosis, frekuensi, durasi, instruksi? }
 * DELETE { id }
 *
 * APOTEKER / ADMIN:
 * GET    ?status=&dari=&sampai=&q=
 * GET    ?id=X
 * PUT    { id, action: 'verifikasi', catatan_verifikasi? }
 * PUT    { id, action: 'siapkan' }
 * PUT    { id, action: 'serahkan', edukasi }
 * PUT    { id, action: 'tolak', catatan_verifikasi }
 *
 * Saat serahkan:
 * - Stok obat otomatis dikurangi.
 * - Mutasi obat dicatat.
 * - Tagihan otomatis diperbarui.
 */
declare(strict_types=1);

require __DIR__ . '/koneksi.php';
require __DIR__ . '/helper.php';

$sess = requireRole(['dokter', 'apoteker', 'admin']);

$method = $_SERVER['REQUEST_METHOD'];
$role   = $sess['role'];
$uid    = (int) $sess['user_id'];

// =========================================================
// HELPER
// =========================================================

function assertRmDraftResep(mysqli $conn, int $rmId, array $sess): void
{
    $stmt = $conn->prepare(
        'SELECT status FROM rekam_medis WHERE id = ? LIMIT 1'
    );
    $stmt->bind_param('i', $rmId);
    $stmt->execute();

    $rm = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$rm) {
        jsonErr('Rekam medis tidak ditemukan.', 404);
    }

    if (
        $rm['status'] === 'selesai'
        && ($sess['role'] ?? '') !== 'admin'
    ) {
        jsonErr('Rekam medis sudah selesai.', 403);
    }
}

function getOrCreateResep(mysqli $conn, int $rmId): int
{
    $stmt = $conn->prepare(
        'SELECT id FROM resep WHERE rekam_medis_id = ? LIMIT 1'
    );
    $stmt->bind_param('i', $rmId);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($row) {
        return (int) $row['id'];
    }

    $stmt = $conn->prepare(
        'INSERT INTO resep (rekam_medis_id) VALUES (?)'
    );
    $stmt->bind_param('i', $rmId);
    $stmt->execute();

    $id = $stmt->insert_id;
    $stmt->close();

    return $id;
}

// =========================================================
// GET
// =========================================================

if ($method === 'GET') {

    // -----------------------------------------------------
    // GET DOKTER: resep berdasarkan rekam medis
    // GET ?rekam_medis_id=X
    // -----------------------------------------------------

    if (isset($_GET['rekam_medis_id'])) {

        if (!in_array($role, ['dokter', 'admin'], true)) {
            jsonErr('Akses tidak diizinkan.', 403);
        }

        $rmId = (int) $_GET['rekam_medis_id'];

        if ($rmId <= 0) {
            jsonErr('rekam_medis_id wajib.', 422);
        }

        $stmt = $conn->prepare(
            'SELECT * FROM resep
             WHERE rekam_medis_id = ?
             LIMIT 1'
        );
        $stmt->bind_param('i', $rmId);
        $stmt->execute();

        $resep = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $items = [];

        if ($resep) {
            $stmt = $conn->prepare(
                'SELECT *
                 FROM resep_item
                 WHERE resep_id = ?
                 ORDER BY id ASC'
            );

            $resepId = (int) $resep['id'];

            $stmt->bind_param('i', $resepId);
            $stmt->execute();

            $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        }

        jsonOk([
            'resep' => $resep,
            'items' => $items,
        ]);
    }

    // -----------------------------------------------------
    // GET APOTEKER: detail satu resep
    // GET ?id=X
    // -----------------------------------------------------

    if (isset($_GET['id'])) {

        if (!in_array($role, ['apoteker', 'admin'], true)) {
            jsonErr('Akses tidak diizinkan.', 403);
        }

        $id = (int) $_GET['id'];

        if ($id <= 0) {
            jsonErr('ID resep tidak valid.', 422);
        }

        $stmt = $conn->prepare(
            "SELECT
                r.*,
                p.id AS pendaftaran_id,
                p.tanggal,
                p.no_reg,
                ps.no_rm,
                ps.nama AS pasien_nama,
                ps.jenis_kelamin,
                ps.tanggal_lahir,
                ps.alergi,
                d.nama AS dokter_nama,
                d.spesialis,
                u_ver.nama_lengkap AS verified_nama,
                u_siap.nama_lengkap AS disiapkan_nama,
                u_serah.nama_lengkap AS diserahkan_nama
             FROM resep r
             JOIN rekam_medis rm ON rm.id = r.rekam_medis_id
             JOIN pendaftaran p ON p.id = rm.pendaftaran_id
             JOIN pasien ps ON ps.id = p.pasien_id
             JOIN dokter d ON d.id = rm.dokter_id
             LEFT JOIN users u_ver ON u_ver.id = r.verified_by
             LEFT JOIN users u_siap ON u_siap.id = r.disiapkan_by
             LEFT JOIN users u_serah ON u_serah.id = r.diserahkan_by
             WHERE r.id = ?
             LIMIT 1"
        );

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $resep = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$resep) {
            jsonErr('Resep tidak ditemukan.', 404);
        }

        $stmt = $conn->prepare(
            'SELECT
                ri.*,
                o.stok AS stok_tersedia,
                o.satuan
             FROM resep_item ri
             LEFT JOIN master_obat o ON o.id = ri.obat_id
             WHERE ri.resep_id = ?
             ORDER BY ri.id ASC'
        );

        $stmt->bind_param('i', $id);
        $stmt->execute();

        $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        jsonOk([
            'resep' => $resep,
            'items' => $items,
        ]);
    }

    // -----------------------------------------------------
    // GET APOTEKER: daftar resep
    // GET ?status=&dari=&sampai=&q=
    // -----------------------------------------------------

    if (!in_array($role, ['apoteker', 'admin'], true)) {
        jsonErr('Akses tidak diizinkan.', 403);
    }

    $status = trim((string) ($_GET['status'] ?? ''));
    $dari   = trim((string) ($_GET['dari'] ?? ''));
    $sampai = trim((string) ($_GET['sampai'] ?? ''));
    $q      = trim((string) ($_GET['q'] ?? ''));

    $sql = "
        SELECT
            r.id,
            r.status,
            r.created_at,
            r.catatan,
            p.tanggal,
            p.no_reg,
            ps.no_rm,
            ps.nama AS pasien_nama,
            d.nama AS dokter_nama,
            (
                SELECT COUNT(*)
                FROM resep_item ri
                WHERE ri.resep_id = r.id
            ) AS jml_item
        FROM resep r
        JOIN rekam_medis rm ON rm.id = r.rekam_medis_id
        JOIN pendaftaran p ON p.id = rm.pendaftaran_id
        JOIN pasien ps ON ps.id = p.pasien_id
        JOIN dokter d ON d.id = rm.dokter_id
        WHERE 1=1
    ";

    $types  = '';
    $params = [];

    if ($status !== '') {
        $sql .= ' AND r.status = ?';
        $types .= 's';
        $params[] = $status;
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

        $sql .= '
            AND (
                ps.nama LIKE ?
                OR ps.no_rm LIKE ?
                OR p.no_reg LIKE ?
            )
        ';

        $types .= 'sss';

        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= ' ORDER BY r.created_at DESC LIMIT 200';

    $stmt = $conn->prepare($sql);

    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();

    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    jsonOk(['data' => $rows]);
}

// =========================================================
// POST — DOKTER: BUAT RESEP / TAMBAH ITEM
// =========================================================

if ($method === 'POST') {

    if (!in_array($role, ['dokter', 'admin'], true)) {
        jsonErr('Akses tidak diizinkan.', 403);
    }

    $in = jsonInput();

    $rmId = (int) ($in['rekam_medis_id'] ?? 0);

    if ($rmId <= 0) {
        jsonErr('rekam_medis_id wajib.', 422);
    }

    assertRmDraftResep($conn, $rmId, $sess);

    $resepId = getOrCreateResep($conn, $rmId);

    // Update catatan resep jika dikirim
    if (array_key_exists('catatan', $in)) {

        $catatan = trim((string) $in['catatan']);

        $stmt = $conn->prepare(
            'UPDATE resep SET catatan = ? WHERE id = ?'
        );

        $stmt->bind_param('si', $catatan, $resepId);
        $stmt->execute();
        $stmt->close();
    }

    $namaObat = strInput($in, 'nama_obat');

    // Tanpa nama obat = hanya membuat resep induk
    if ($namaObat === '') {
        jsonOk([
            'message' => 'Resep dibuat.',
            'resep_id' => $resepId,
        ]);
    }

    $obatId = (
        isset($in['obat_id']) && $in['obat_id'] !== ''
    ) ? (int) $in['obat_id'] : null;

    $dosis     = strInput($in, 'dosis');
    $frekuensi = strInput($in, 'frekuensi');
    $durasi    = strInput($in, 'durasi');
    $instruksi = strInput($in, 'instruksi');

    if ($dosis === '' || $frekuensi === '' || $durasi === '') {
        jsonErr('Dosis, frekuensi, dan durasi wajib diisi.', 422);
    }

    $stmt = $conn->prepare(
        'INSERT INTO resep_item
            (resep_id, obat_id, nama_obat, dosis, frekuensi, durasi, instruksi)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    $stmt->bind_param(
        'iisssss',
        $resepId,
        $obatId,
        $namaObat,
        $dosis,
        $frekuensi,
        $durasi,
        $instruksi
    );

    $stmt->execute();

    $id = $stmt->insert_id;
    $stmt->close();

    jsonOk([
        'message' => 'Item resep ditambahkan.',
        'id' => $id,
        'resep_id' => $resepId,
    ]);
}

// =========================================================
// DELETE — DOKTER: HAPUS ITEM RESEP
// =========================================================

if ($method === 'DELETE') {

    if (!in_array($role, ['dokter', 'admin'], true)) {
        jsonErr('Akses tidak diizinkan.', 403);
    }

    $in = jsonInput();

    $id = (int) ($in['id'] ?? 0);

    if ($id <= 0) {
        jsonErr('ID wajib.', 422);
    }

    $stmt = $conn->prepare(
        'SELECT
            ri.resep_id,
            r.rekam_medis_id
         FROM resep_item ri
         JOIN resep r ON r.id = ri.resep_id
         WHERE ri.id = ?
         LIMIT 1'
    );

    $stmt->bind_param('i', $id);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row) {
        jsonErr('Item resep tidak ditemukan.', 404);
    }

    assertRmDraftResep(
        $conn,
        (int) $row['rekam_medis_id'],
        $sess
    );

    $stmt = $conn->prepare(
        'DELETE FROM resep_item WHERE id = ?'
    );

    $stmt->bind_param('i', $id);
    $stmt->execute();
    $stmt->close();

    jsonOk(['message' => 'Item resep dihapus.']);
}

// =========================================================
// PUT — APOTEKER: AKSI RESEP
// =========================================================

if ($method === 'PUT') {

    if (!in_array($role, ['apoteker', 'admin'], true)) {
        jsonErr('Akses tidak diizinkan.', 403);
    }

    $in = jsonInput();

    $id = (int) ($in['id'] ?? 0);

    if ($id <= 0) {
        jsonErr('ID wajib.', 422);
    }

    $action = strInput($in, 'action');

    // Ambil resep dan status
    $stmt = $conn->prepare(
        'SELECT id, status
         FROM resep
         WHERE id = ?
         LIMIT 1'
    );

    $stmt->bind_param('i', $id);
    $stmt->execute();

    $resep = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$resep) {
        jsonErr('Resep tidak ditemukan.', 404);
    }

    $curr = $resep['status'];

    // -----------------------------------------------------
    // VERIFIKASI
    // -----------------------------------------------------

    if ($action === 'verifikasi') {

        if ($curr !== 'masuk') {
            jsonErr('Resep bukan status masuk.', 409);
        }

        $catatan = strInput($in, 'catatan_verifikasi');

        $stmt = $conn->prepare(
            "UPDATE resep
             SET status = 'diverifikasi',
                 verified_by = ?,
                 verified_at = NOW(),
                 catatan_verifikasi = ?
             WHERE id = ? AND status = 'masuk'"
        );

        $stmt->bind_param('isi', $uid, $catatan, $id);
        $stmt->execute();

        $updated = $stmt->affected_rows;
        $stmt->close();

        if ($updated !== 1) {
            jsonErr('Status resep berubah. Muat ulang data.', 409);
        }

        jsonOk(['message' => 'Resep terverifikasi.']);
    }

    // -----------------------------------------------------
    // SIAPKAN
    // -----------------------------------------------------

    if ($action === 'siapkan') {

        if ($curr !== 'diverifikasi') {
            jsonErr('Resep belum diverifikasi.', 409);
        }

        $stmt = $conn->prepare(
            "UPDATE resep
             SET status = 'disiapkan',
                 disiapkan_by = ?,
                 disiapkan_at = NOW()
             WHERE id = ? AND status = 'diverifikasi'"
        );

        $stmt->bind_param('ii', $uid, $id);
        $stmt->execute();

        $updated = $stmt->affected_rows;
        $stmt->close();

        if ($updated !== 1) {
            jsonErr('Status resep berubah. Muat ulang data.', 409);
        }

        jsonOk(['message' => 'Obat siap diserahkan.']);
    }

    // -----------------------------------------------------
    // SERAHKAN — POTONG STOK DAN CATAT MUTASI
    // -----------------------------------------------------

    if ($action === 'serahkan') {

        if ($curr !== 'disiapkan') {
            jsonErr('Resep belum disiapkan.', 409);
        }

        $edukasi = strInput($in, 'edukasi');

        if ($edukasi === '') {
            jsonErr('Edukasi obat wajib diisi.', 422);
        }

        $conn->begin_transaction();

        try {

            // Lock resep agar tidak diserahkan dua kali bersamaan
            $stmt = $conn->prepare(
                'SELECT status
                 FROM resep
                 WHERE id = ?
                 FOR UPDATE'
            );

            $stmt->bind_param('i', $id);
            $stmt->execute();

            $lockedResep = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$lockedResep || $lockedResep['status'] !== 'disiapkan') {
                throw new RuntimeException(
                    'Resep tidak lagi berstatus disiapkan.'
                );
            }

            // Ambil seluruh item resep
            $stmt = $conn->prepare(
                'SELECT
                    ri.id,
                    ri.obat_id,
                    ri.nama_obat
                 FROM resep_item ri
                 WHERE ri.resep_id = ?
                 ORDER BY ri.id ASC'
            );

            $stmt->bind_param('i', $id);
            $stmt->execute();

            $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();

            if (count($items) === 0) {
                throw new RuntimeException(
                    'Resep tidak punya item obat.'
                );
            }

            // Proses stok setiap item
            foreach ($items as $it) {

                // Obat tanpa relasi master tidak memotong stok
                if ($it['obat_id'] === null) {
                    continue;
                }

                $obatId = (int) $it['obat_id'];

                // Lock stok obat
                $stmt = $conn->prepare(
                    'SELECT stok
                     FROM master_obat
                     WHERE id = ?
                     FOR UPDATE'
                );

                $stmt->bind_param('i', $obatId);
                $stmt->execute();

                $obat = $stmt->get_result()->fetch_assoc();
                $stmt->close();

                if (!$obat) {
                    throw new RuntimeException(
                        "Data obat '{$it['nama_obat']}' tidak ditemukan."
                    );
                }

                $stokSebelum = (int) $obat['stok'];

                // Asumsi sementara: 1 unit untuk setiap item resep
                $jumlah = 1;

                if ($stokSebelum < $jumlah) {
                    throw new RuntimeException(
                        "Stok obat '{$it['nama_obat']}' tidak cukup."
                    );
                }

                $stokSesudah = $stokSebelum - $jumlah;

                // Update stok
                $stmt = $conn->prepare(
                    'UPDATE master_obat
                     SET stok = ?
                     WHERE id = ?'
                );

                $stmt->bind_param(
                    'ii',
                    $stokSesudah,
                    $obatId
                );

                $stmt->execute();
                $stmt->close();

                // Catat mutasi
                $ref = 'resep_item:' . $it['id'];
                $catatanMutasi = 'Penyerahan resep #' . $id;

                $stmt = $conn->prepare(
                    'INSERT INTO obat_mutasi
                        (
                            obat_id,
                            tipe,
                            jumlah,
                            stok_sebelum,
                            stok_sesudah,
                            referensi,
                            catatan,
                            created_by
                        )
                     VALUES (?, "keluar", ?, ?, ?, ?, ?, ?)'
                );

                $stmt->bind_param(
                    'iiiissi',
                    $obatId,
                    $jumlah,
                    $stokSebelum,
                    $stokSesudah,
                    $ref,
                    $catatanMutasi,
                    $uid
                );

                $stmt->execute();
                $stmt->close();
            }

            // Update status resep
            $stmt = $conn->prepare(
                "UPDATE resep
                 SET status = 'diserahkan',
                     diserahkan_by = ?,
                     diserahkan_at = NOW(),
                     edukasi = ?
                 WHERE id = ? AND status = 'disiapkan'"
            );

            $stmt->bind_param('isi', $uid, $edukasi, $id);
            $stmt->execute();

            if ($stmt->affected_rows !== 1) {
                $stmt->close();

                throw new RuntimeException(
                    'Gagal memperbarui status resep.'
                );
            }

            $stmt->close();

            // Ambil pendaftaran untuk pembaruan tagihan
            $stmt = $conn->prepare(
                'SELECT rm.pendaftaran_id
                 FROM resep r
                 JOIN rekam_medis rm ON rm.id = r.rekam_medis_id
                 WHERE r.id = ?
                 LIMIT 1'
            );

            $stmt->bind_param('i', $id);
            $stmt->execute();

            $rRow = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            $conn->commit();

        } catch (Throwable $e) {

            $conn->rollback();

            error_log(
                'Gagal menyerahkan resep #' . $id . ': ' . $e->getMessage()
            );

            $message = str_contains($e->getMessage(), 'Stok')
                || str_contains($e->getMessage(), 'obat')
                || str_contains($e->getMessage(), 'Resep')
                ? $e->getMessage()
                : 'Gagal menyerahkan obat.';

            jsonErr($message, 409);
        }

        // Refresh tagihan setelah transaksi stok berhasil
        try {

            if ($rRow) {
                buatTagihanOtomatis(
                    $conn,
                    (int) $rRow['pendaftaran_id']
                );
            }

        } catch (Throwable $e) {

            error_log(
                'Gagal refresh tagihan (apoteker): '
                . $e->getMessage()
            );
        }

        jsonOk([
            'message' => 'Obat diserahkan. Stok diperbarui.'
        ]);
    }

    // -----------------------------------------------------
    // TOLAK
    // -----------------------------------------------------

    if ($action === 'tolak') {

        if (!in_array($curr, ['masuk', 'diverifikasi'], true)) {
            jsonErr('Resep tidak bisa ditolak pada status ini.', 409);
        }

        $catatan = strInput($in, 'catatan_verifikasi');

        if ($catatan === '') {
            jsonErr('Alasan penolakan wajib diisi.', 422);
        }

        $stmt = $conn->prepare(
            "UPDATE resep
             SET status = 'ditolak',
                 verified_by = ?,
                 verified_at = NOW(),
                 catatan_verifikasi = ?
             WHERE id = ? AND status = ?"
        );

        $stmt->bind_param('isis', $uid, $catatan, $id, $curr);
        $stmt->execute();

        $updated = $stmt->affected_rows;
        $stmt->close();

        if ($updated !== 1) {
            jsonErr('Status resep berubah. Muat ulang data.', 409);
        }

        jsonOk(['message' => 'Resep ditolak.']);
    }

    jsonErr('Aksi tidak dikenal.', 422);
}

// =========================================================
// METHOD TIDAK DIIZINKAN
// =========================================================

jsonErr('Method tidak diizinkan.', 405);
