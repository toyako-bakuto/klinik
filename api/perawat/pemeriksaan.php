<?php
/**
 * CRUD pemeriksaan awal.
 *
 * GET    ?pendaftaran_id=X   → ambil PA + tindakan untuk 1 kunjungan
 * POST   { pendaftaran_id }  → buat PA baru (draft) kalau belum ada
 * PUT    { id, ...vital, keluhan, anamnesis, catatan }  → update data (hanya draft)
 * PUT    { id, action: 'selesai' }  → selesaikan & teruskan ke dokter
 * DELETE tidak tersedia (data klinis tidak boleh dihapus sembarangan)
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['perawat', 'admin']);
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // =====================================================
    // GET — detail PA + tindakan
    // =====================================================
    case 'GET':
        $pendaftaranId = (int)($_GET['pendaftaran_id'] ?? 0);
        if ($pendaftaranId <= 0) jsonErr('pendaftaran_id wajib diisi.', 422);

        // Ambil pendaftaran + pasien + dokter
        $stmt = $conn->prepare(
            "SELECT p.id, p.no_reg, p.tanggal, p.keluhan AS keluhan_daftar,
                    p.status AS status_pendaftaran,
                    ps.no_rm, ps.nama AS pasien_nama, ps.jenis_kelamin,
                    ps.tanggal_lahir, ps.alamat,
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
        if (!$pendaftaran) jsonErr('Pendaftaran tidak ditemukan.', 404);

        // Ambil PA (kalau sudah ada)
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

        // Ambil tindakan (kalau PA ada)
        $tindakan = [];
        if ($pa) {
            $stmt = $conn->prepare(
                'SELECT id, nama_tindakan, keterangan, waktu
                 FROM tindakan_keperawatan
                 WHERE pemeriksaan_awal_id = ?
                 ORDER BY waktu ASC'
            );
            $stmt->bind_param('i', $pa['id']);
            $stmt->execute();
            $tindakan = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        }

        jsonOk([
            'pendaftaran' => $pendaftaran,
            'pemeriksaan' => $pa,
            'tindakan'    => $tindakan,
        ]);
        break;

    // =====================================================
    // POST — buat PA baru (draft)
    // =====================================================
    case 'POST':
        $in = jsonInput();
        $pendaftaranId = (int)($in['pendaftaran_id'] ?? 0);
        if ($pendaftaranId <= 0) jsonErr('pendaftaran_id wajib diisi.', 422);

        // Cek pendaftaran ada
        $stmt = $conn->prepare(
            "SELECT id, status, keluhan FROM pendaftaran WHERE id = ? LIMIT 1"
        );
        $stmt->bind_param('i', $pendaftaranId);
        $stmt->execute();
        $pendaftaran = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$pendaftaran) jsonErr('Pendaftaran tidak ditemukan.', 404);

        if ($pendaftaran['status'] !== 'menunggu') {
            jsonErr('Pendaftaran tidak dalam status menunggu.', 409);
        }

        // Cek belum ada PA
        $stmt = $conn->prepare(
            'SELECT id FROM pemeriksaan_awal WHERE pendaftaran_id = ? LIMIT 1'
        );
        $stmt->bind_param('i', $pendaftaranId);
        $stmt->execute();
        $existing = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($existing) {
            jsonOk(['message' => 'Pemeriksaan awal sudah ada.', 'id' => (int)$existing['id']]);
        }

        // Buat draft
        $perawatId = (int)$sess['user_id'];
        $stmt = $conn->prepare(
            'INSERT INTO pemeriksaan_awal (pendaftaran_id, perawat_id, keluhan, status)
             VALUES (?, ?, ?, "draft")'
        );
        $keluhanAwal = (string)($pendaftaran['keluhan'] ?? '');
        $stmt->bind_param('iis', $pendaftaranId, $perawatId, $keluhanAwal);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();

        jsonOk([
            'message' => 'Pemeriksaan awal dibuat.',
            'id'      => $id,
        ]);
        break;

    // =====================================================
    // PUT — update data ATAU selesaikan
    // =====================================================
    case 'PUT':
        $in = jsonInput();
        $id = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID wajib diisi.', 422);

        // Ambil PA lama
        $stmt = $conn->prepare('SELECT * FROM pemeriksaan_awal WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $pa = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$pa) jsonErr('Pemeriksaan tidak ditemukan.', 404);

        // Perawat tidak boleh edit PA yang sudah selesai
        if ($pa['status'] === 'selesai' && ($sess['role'] ?? '') !== 'admin') {
            jsonErr('Pemeriksaan sudah selesai, tidak bisa diubah.', 403);
        }

        $action = strInput($in, 'action');

        // ---- Aksi: selesaikan ----
        if ($action === 'selesai') {
            // --- Validasi ---
            $required = ['keluhan', 'suhu', 'sistolik', 'diastolik'];
            foreach ($required as $k) {
                if (!isset($in[$k]) || $in[$k] === '' || $in[$k] === null) {
                    if ($k === 'keluhan' && !empty($pa['keluhan'])) continue;
                    jsonErr("Field '{$k}' wajib diisi sebelum menyelesaikan.", 422);
                }
            }

            // --- Hitung nilai baru (sama seperti branch update) ---
            $suhu      = array_key_exists('suhu', $in)     ? ($in['suhu'] === '' ? null : (float)$in['suhu'])     : $pa['suhu'];
            $sistolik  = array_key_exists('sistolik', $in) ? ($in['sistolik'] === '' ? null : (int)$in['sistolik']) : $pa['sistolik'];
            $diastolik = array_key_exists('diastolik',$in) ? ($in['diastolik'] === '' ? null : (int)$in['diastolik']): $pa['diastolik'];
            $nadi      = array_key_exists('nadi', $in)     ? ($in['nadi'] === '' ? null : (int)$in['nadi'])         : $pa['nadi'];
            $napas     = array_key_exists('pernapasan',$in) ? ($in['pernapasan'] === '' ? null : (int)$in['pernapasan']) : $pa['pernapasan'];
            $saturasi  = array_key_exists('saturasi_oksigen',$in) ? ($in['saturasi_oksigen'] === '' ? null : (int)$in['saturasi_oksigen']) : $pa['saturasi_oksigen'];
            $bb        = array_key_exists('berat_badan',$in) ? ($in['berat_badan'] === '' ? null : (float)$in['berat_badan']) : $pa['berat_badan'];
            $tb        = array_key_exists('tinggi_badan',$in)? ($in['tinggi_badan'] === '' ? null : (float)$in['tinggi_badan']) : $pa['tinggi_badan'];
            $keluhan   = array_key_exists('keluhan', $in)  ? trim((string)$in['keluhan'])  : $pa['keluhan'];
            $anamnesis = array_key_exists('anamnesis', $in)? trim((string)$in['anamnesis']): $pa['anamnesis'];
            $catatan   = array_key_exists('catatan', $in)  ? trim((string)$in['catatan'])  : $pa['catatan'];

            $conn->begin_transaction();
            try {
                // 1️⃣ SIMPAN field vital + status sekaligus
                $stmt = $conn->prepare(
                    'UPDATE pemeriksaan_awal
                    SET suhu=?, sistolik=?, diastolik=?, nadi=?, pernapasan=?,
                        saturasi_oksigen=?, berat_badan=?, tinggi_badan=?,
                        keluhan=?, anamnesis=?, catatan=?,
                        status="selesai", selesai_at=NOW()
                    WHERE id=?'
                );
                $stmt->bind_param(
                    'diiiididsssi',
                    $suhu, $sistolik, $diastolik, $nadi, $napas,
                    $saturasi, $bb, $tb,
                    $keluhan, $anamnesis, $catatan, $id
                );
                $stmt->execute();
                $stmt->close();

                // 2️⃣ Update pendaftaran & antrean (tetap seperti sebelumnya)
                $stmt = $conn->prepare(
                    "UPDATE pendaftaran SET status = 'menunggu_dokter' WHERE id = ?"
                );
                $stmt->bind_param('i', $pa['pendaftaran_id']);
                $stmt->execute();
                $stmt->close();

                $stmt = $conn->prepare(
                    "UPDATE antrean SET status = 'menunggu_dokter' WHERE pendaftaran_id = ?"
                );
                $stmt->bind_param('i', $pa['pendaftaran_id']);
                $stmt->execute();
                $stmt->close();

                $conn->commit();
            } catch (Throwable $e) {
                $conn->rollback();
                jsonErr('Gagal menyelesaikan pemeriksaan.', 500);
            }

            jsonOk(['message' => 'Pemeriksaan selesai. Pasien diteruskan ke dokter.']);
        }



        // ---- Aksi: update field ----
        // Ambil nilai (pakai nilai lama kalau tidak dikirim)
        $suhu     = array_key_exists('suhu', $in)     ? ($in['suhu'] === '' ? null : (float)$in['suhu'])     : $pa['suhu'];
        $sistolik = array_key_exists('sistolik', $in) ? ($in['sistolik'] === '' ? null : (int)$in['sistolik']) : $pa['sistolik'];
        $diastolik= array_key_exists('diastolik', $in)? ($in['diastolik'] === '' ? null : (int)$in['diastolik']): $pa['diastolik'];
        $nadi     = array_key_exists('nadi', $in)     ? ($in['nadi'] === '' ? null : (int)$in['nadi'])         : $pa['nadi'];
        $napas    = array_key_exists('pernapasan', $in)? ($in['pernapasan'] === '' ? null : (int)$in['pernapasan']): $pa['pernapasan'];
        $saturasi = array_key_exists('saturasi_oksigen', $in) ? ($in['saturasi_oksigen'] === '' ? null : (int)$in['saturasi_oksigen']) : $pa['saturasi_oksigen'];
        $bb       = array_key_exists('berat_badan', $in) ? ($in['berat_badan'] === '' ? null : (float)$in['berat_badan']) : $pa['berat_badan'];
        $tb       = array_key_exists('tinggi_badan', $in)? ($in['tinggi_badan'] === '' ? null : (float)$in['tinggi_badan']): $pa['tinggi_badan'];
        $keluhan  = array_key_exists('keluhan', $in)  ? trim((string)$in['keluhan'])  : $pa['keluhan'];
        $anamnesis= array_key_exists('anamnesis', $in)? trim((string)$in['anamnesis']): $pa['anamnesis'];
        $catatan  = array_key_exists('catatan', $in)  ? trim((string)$in['catatan'])  : $pa['catatan'];

        $stmt = $conn->prepare(
            'UPDATE pemeriksaan_awal
             SET suhu=?, sistolik=?, diastolik=?, nadi=?, pernapasan=?,
                 saturasi_oksigen=?, berat_badan=?, tinggi_badan=?,
                 keluhan=?, anamnesis=?, catatan=?
             WHERE id=?'
        );
        $stmt->bind_param(
            'diiiididsssi',
            $suhu, $sistolik, $diastolik, $nadi, $napas,
            $saturasi, $bb, $tb,
            $keluhan, $anamnesis, $catatan, $id
        );
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Pemeriksaan diperbarui.']);
        break;

    default:
        jsonErr('Method tidak diizinkan.', 405);
}