<?php
/**
 * Rekam medis dokter.
 *
 * GET  ?pendaftaran_id=X  → RM + PA + tindakan + resep + lab + riwayat pasien
 * POST { pendaftaran_id } → buat RM draft (kalau belum ada), set status diperiksa
 * PUT  { id, ...field }   → update RM (hanya draft)
 * PUT  { id, action:'minta_lab' } → set status pendaftaran=menunggu_lab
 * PUT  { id, action:'selesai' }   → RM selesai, pendaftaran selesai
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['dokter', 'admin']);
$method = $_SERVER['REQUEST_METHOD'];

// ---- Helper: cek akses dokter ke pendaftaran ----
function assertAksesDokter(mysqli $conn, int $pendaftaranId, array $sess): array
{
    $stmt = $conn->prepare(
        'SELECT p.*, d.user_id AS dokter_user_id
         FROM pendaftaran p
         JOIN dokter d ON d.id = p.dokter_id
         WHERE p.id = ? LIMIT 1'
    );
    $stmt->bind_param('i', $pendaftaranId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) jsonErr('Pendaftaran tidak ditemukan.', 404);

    if (($sess['role'] ?? '') !== 'admin'
        && (int)$row['dokter_user_id'] !== (int)$sess['user_id']) {
        jsonErr('Akses ditolak: bukan pasien Anda.', 403);
    }
    return $row;
}

switch ($method) {

    // =====================================================
    // GET — detail lengkap
    // =====================================================
    case 'GET':
        $pendaftaranId = (int)($_GET['pendaftaran_id'] ?? 0);
        if ($pendaftaranId <= 0) jsonErr('pendaftaran_id wajib diisi.', 422);

        $pendaftaran = assertAksesDokter($conn, $pendaftaranId, $sess);

        // Detail pasien + dokter
        $stmt = $conn->prepare(
            "SELECT p.id, p.no_reg, p.tanggal, p.status AS status_pendaftaran,
                    ps.id AS pasien_id, ps.no_rm, ps.nama AS pasien_nama,
                    ps.jenis_kelamin, ps.tanggal_lahir, ps.telepon, ps.alamat,
                    d.nama AS dokter_nama, d.spesialis,
                    a.no_antrean
             FROM pendaftaran p
             JOIN pasien ps ON ps.id = p.pasien_id
             JOIN dokter d  ON d.id  = p.dokter_id
             LEFT JOIN antrean a ON a.pendaftaran_id = p.id
             WHERE p.id = ? LIMIT 1"
        );
        $stmt->bind_param('i', $pendaftaranId);
        $stmt->execute();
        $pendaftaran = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        // PA perawat
        $stmt = $conn->prepare(
            "SELECT pa.*, u.nama_lengkap AS perawat_nama
             FROM pemeriksaan_awal pa
             JOIN users u ON u.id = pa.perawat_id
             WHERE pa.pendaftaran_id = ? LIMIT 1"
        );
        $stmt->bind_param('i', $pendaftaranId);
        $stmt->execute();
        $pa = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        // RM
        $stmt = $conn->prepare(
            'SELECT * FROM rekam_medis WHERE pendaftaran_id = ? LIMIT 1'
        );
        $stmt->bind_param('i', $pendaftaranId);
        $stmt->execute();
        $rm = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $tindakan = [];
        $resep    = null;
        $resepItem= [];
        $lab      = [];

        if ($rm) {
            // Tindakan medis
            $stmt = $conn->prepare(
                'SELECT id, nama_tindakan, keterangan, waktu
                 FROM tindakan_medis WHERE rekam_medis_id = ? ORDER BY waktu ASC'
            );
            $stmt->bind_param('i', $rm['id']);
            $stmt->execute();
            $tindakan = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();

            // Resep induk
            $stmt = $conn->prepare('SELECT * FROM resep WHERE rekam_medis_id = ? LIMIT 1');
            $stmt->bind_param('i', $rm['id']);
            $stmt->execute();
            $resep = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            // Resep item
            if ($resep) {
                $stmt = $conn->prepare(
                    'SELECT * FROM resep_item WHERE resep_id = ? ORDER BY id ASC'
                );
                $stmt->bind_param('i', $resep['id']);
                $stmt->execute();
                $resepItem = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmt->close();
            }

            // Permintaan lab
            $stmt = $conn->prepare(
                'SELECT * FROM permintaan_lab WHERE rekam_medis_id = ? ORDER BY waktu_diminta ASC'
            );
            $stmt->bind_param('i', $rm['id']);
            $stmt->execute();
            $lab = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        }

        // Riwayat pasien (RM lain milik pasien yang sama, selain kunjungan ini)
        $stmt = $conn->prepare(
            "SELECT rm.id, rm.diagnosis_utama, rm.diagnosis_kode, rm.status,
                    rm.selesai_at,
                    p.tanggal, p.no_reg,
                    d.nama AS dokter_nama, d.spesialis
             FROM rekam_medis rm
             JOIN pendaftaran p ON p.id = rm.pendaftaran_id
             JOIN dokter d      ON d.id = rm.dokter_id
             WHERE p.pasien_id = ? AND rm.pendaftaran_id <> ?
             ORDER BY p.tanggal DESC LIMIT 10"
        );
        $stmt->bind_param('ii', $pendaftaran['pasien_id'], $pendaftaranId);
        $stmt->execute();
        $riwayat = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        jsonOk([
            'pendaftaran' => $pendaftaran,
            'pemeriksaan_awal' => $pa,
            'rekam_medis' => $rm,
            'tindakan'    => $tindakan,
            'resep'       => $resep,
            'resep_item'  => $resepItem,
            'lab'         => $lab,
            'riwayat'     => $riwayat,
        ]);
        break;

    // =====================================================
    // POST — buat RM draft + ubah status pendaftaran → diperiksa
    // =====================================================
    case 'POST':
        $in = jsonInput();
        $pendaftaranId = (int)($in['pendaftaran_id'] ?? 0);
        if ($pendaftaranId <= 0) jsonErr('pendaftaran_id wajib diisi.', 422);

        $pendaftaran = assertAksesDokter($conn, $pendaftaranId, $sess);

        if (!in_array($pendaftaran['status'], ['menunggu_dokter', 'diperiksa', 'menunggu_lab'], true)) {
            jsonErr('Pendaftaran tidak dalam status yang bisa diperiksa.', 409);
        }

        // Cek sudah ada RM
        $stmt = $conn->prepare('SELECT id FROM rekam_medis WHERE pendaftaran_id = ? LIMIT 1');
        $stmt->bind_param('i', $pendaftaranId);
        $stmt->execute();
        $existing = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($existing) {
            jsonOk(['message' => 'Rekam medis sudah ada.', 'id' => (int)$existing['id']]);
        }

        // Ambil PA untuk snapshot keluhan & anamnesis awal
        $stmt = $conn->prepare(
            'SELECT keluhan, anamnesis FROM pemeriksaan_awal WHERE pendaftaran_id = ? LIMIT 1'
        );
        $stmt->bind_param('i', $pendaftaranId);
        $stmt->execute();
        $pa = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $keluhan   = $pa['keluhan']   ?? '';
        $anamnesis = $pa['anamnesis'] ?? '';

        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare(
                'INSERT INTO rekam_medis (pendaftaran_id, dokter_id, keluhan, anamnesis, status)
                 VALUES (?, ?, ?, ?, "draft")'
            );
            $stmt->bind_param('iiss',
                $pendaftaranId, $pendaftaran['dokter_id'], $keluhan, $anamnesis
            );
            $stmt->execute();
            $rmId = $stmt->insert_id;
            $stmt->close();

            // Ubah status pendaftaran → diperiksa (kalau masih menunggu_dokter)
            if ($pendaftaran['status'] === 'menunggu_dokter') {
                $stmt = $conn->prepare(
                    "UPDATE pendaftaran SET status = 'diperiksa' WHERE id = ?"
                );
                $stmt->bind_param('i', $pendaftaranId);
                $stmt->execute();
                $stmt->close();

                $stmt = $conn->prepare(
                    "UPDATE antrean SET status = 'diperiksa' WHERE pendaftaran_id = ?"
                );
                $stmt->bind_param('i', $pendaftaranId);
                $stmt->execute();
                $stmt->close();
            }

            $conn->commit();
        } catch (Throwable $e) {
            $conn->rollback();
            jsonErr('Gagal membuat rekam medis.', 500);
        }

        jsonOk(['message' => 'Rekam medis dibuat.', 'id' => $rmId]);
        break;

    // =====================================================
    // PUT — update / aksi
    // =====================================================
    case 'PUT':
        $in = jsonInput();
        $id = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID wajib diisi.', 422);

        // Ambil RM
        $stmt = $conn->prepare('SELECT * FROM rekam_medis WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $rm = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$rm) jsonErr('Rekam medis tidak ditemukan.', 404);

        assertAksesDokter($conn, (int)$rm['pendaftaran_id'], $sess);

        if ($rm['status'] === 'selesai' && ($sess['role'] ?? '') !== 'admin') {
            jsonErr('Rekam medis sudah selesai.', 403);
        }

        $action = strInput($in, 'action');

        // ----- Aksi: minta lab -----
        if ($action === 'minta_lab') {
            $conn->begin_transaction();
            try {
                $stmt = $conn->prepare(
                    "UPDATE pendaftaran SET status = 'menunggu_lab' WHERE id = ?"
                );
                $stmt->bind_param('i', $rm['pendaftaran_id']);
                $stmt->execute();
                $stmt->close();

                $stmt = $conn->prepare(
                    "UPDATE antrean SET status = 'menunggu_lab' WHERE pendaftaran_id = ?"
                );
                $stmt->bind_param('i', $rm['pendaftaran_id']);
                $stmt->execute();
                $stmt->close();

                $conn->commit();
            } catch (Throwable $e) {
                $conn->rollback();
                jsonErr('Gagal mengubah status.', 500);
            }
            jsonOk(['message' => 'Pasien menunggu hasil laboratorium.']);
        }

        // ----- Aksi: selesai -----
        if ($action === 'selesai') {
            // Validasi minimal
            if (empty($rm['diagnosis_utama']) && empty($in['diagnosis_utama'])) {
                jsonErr('Diagnosis utama wajib diisi sebelum menyelesaikan.', 422);
            }

            // Update field dulu (kalau ada yang dikirim)
            // (dilakukan di bawah, lalu set selesai)

            $conn->begin_transaction();
            try {
                // Update field terakhir (kalau dikirim)
                $fields = updateRmFields($conn, $id, $rm, $in);

                $stmt = $conn->prepare(
                    'UPDATE rekam_medis
                     SET status = "selesai", selesai_at = NOW()
                     WHERE id = ?'
                );
                $stmt->bind_param('i', $id);
                $stmt->execute();
                $stmt->close();

                $stmt = $conn->prepare(
                    "UPDATE pendaftaran SET status = 'selesai' WHERE id = ?"
                );
                $stmt->bind_param('i', $rm['pendaftaran_id']);
                $stmt->execute();
                $stmt->close();

                $stmt = $conn->prepare(
                    "UPDATE antrean SET status = 'selesai' WHERE pendaftaran_id = ?"
                );
                $stmt->bind_param('i', $rm['pendaftaran_id']);
                $stmt->execute();
                $stmt->close();

                $conn->commit();
            } catch (Throwable $e) {
                $conn->rollback();
                jsonErr('Gagal menyelesaikan rekam medis.', 500);
            }
            jsonOk(['message' => 'Pemeriksaan selesai.']);
        }

        // ----- Update field biasa -----
        updateRmFields($conn, $id, $rm, $in);
        jsonOk(['message' => 'Rekam medis diperbarui.']);
        break;

    default:
        jsonErr('Method tidak diizinkan.', 405);
}

// =========================================================
// Helper: update field RM
// =========================================================
function updateRmFields(mysqli $conn, int $id, array $old, array $in): void
{
    $get = fn($k) => array_key_exists($k, $in) ? trim((string)$in[$k]) : (string)($old[$k] ?? '');

    $keluhan     = $get('keluhan');
    $anamnesis   = $get('anamnesis');
    $fisik       = $get('pemeriksaan_fisik');
    $catatan     = $get('catatan');
    $dxUtama     = $get('diagnosis_utama');
    $dxKode      = $get('diagnosis_kode');
    $dxSekunder  = $get('diagnosis_sekunder');

    $stmt = $conn->prepare(
        'UPDATE rekam_medis
         SET keluhan=?, anamnesis=?, pemeriksaan_fisik=?, catatan=?,
             diagnosis_utama=?, diagnosis_kode=?, diagnosis_sekunder=?
         WHERE id=?'
    );
    $stmt->bind_param(
        'sssssssi',
        $keluhan, $anamnesis, $fisik, $catatan,
        $dxUtama, $dxKode, $dxSekunder, $id
    );
    $stmt->execute();
    $stmt->close();
}