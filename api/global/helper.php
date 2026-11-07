<?php
declare(strict_types=1);


// Konfigurasi session & timeout
const SESSION_IDLE_TIMEOUT = 7200;

function bootSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;

    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();

    if (isset($_SESSION['last_activity'])
        && (time() - $_SESSION['last_activity']) > SESSION_IDLE_TIMEOUT) {
        session_unset();
        session_destroy();
        session_start();
    }
    $_SESSION['last_activity'] = time();
}

// Guard
function requireLogin(): array
{
    bootSession();
    if (empty($_SESSION['user_id'])) {
        jsonErr('Belum login.', 401, ['redirect' => '/klinik/index.html']);
    }
    return $_SESSION;
}

function requireRole(array $allowedRoles): array
{
    $sess = requireLogin();
    if (!in_array($sess['role'] ?? '', $allowedRoles, true)) {
        jsonErr('Akses ditolak.', 403, ['redirect' => '/klinik/index.html']);
    }
    return $sess;
}

// Input helpers
function jsonInput(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function strInput(array $data, string $key, string $default = ''): string
{
    return isset($data[$key]) ? trim((string)$data[$key]) : $default;
}

// Json Response
function jsonOut(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonOk(array $data = []): void
{
    jsonOut(['success' => true] + $data);
}

function jsonErr(string $message, int $status = 400, array $extra = []): void
{
    jsonOut(['success' => false, 'message' => $message] + $extra, $status);
}

// Redirect map
function redirectForRole(string $role): string
{
    return match ($role) {
        'admin'       => 'admin/index.html',
        'resepsionis' => 'admin/index.html',
        'dokter'      => 'dokter/index.html',
        'perawat'     => 'perawat/index.html',
        'apoteker'    => 'apoteker/index.html',
        'kasir'       => 'kasir/index.html',
        'lab'         => 'lab/index.html',
        'pasien'      => 'pasien/index.html',
        default       => 'index.html',
    };
}

function buatTagihanOtomatis(mysqli $conn, int $pendaftaranId): int
{
    // Cek existing
    $stmt = $conn->prepare('SELECT id, status FROM tagihan WHERE pendaftaran_id = ? LIMIT 1');
    $stmt->bind_param('i', $pendaftaranId);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($existing && in_array($existing['status'], ['sebagian', 'lunas', 'dibatalkan'], true)) {
        return (int)$existing['id'];
    }

    // Hitung item live
    $items = hitungTagihanLive($conn, $pendaftaranId);

    // Ambil pasien_id
    $stmt = $conn->prepare('SELECT pasien_id FROM pendaftaran WHERE id = ? LIMIT 1');
    $stmt->bind_param('i', $pendaftaranId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) return 0;

    $pasienId = (int)$row['pasien_id'];
    $total = 0.0;
    foreach ($items as $it) $total += (float)$it['subtotal'];

    // ---- Sudah ada & masih belum_bayar → refresh ----
    if ($existing) {
        $tagihanId = (int)$existing['id'];

        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare('DELETE FROM tagihan_item WHERE tagihan_id = ?');
            $stmt->bind_param('i', $tagihanId);
            $stmt->execute();
            $stmt->close();

            $bindTotal = $total;
            $stmt = $conn->prepare('UPDATE tagihan SET total = ? WHERE id = ?');
            $stmt->bind_param('di', $bindTotal, $tagihanId);
            $stmt->execute();
            $stmt->close();

            if (count($items) > 0) {
                $stmt = $conn->prepare(
                    'INSERT INTO tagihan_item
                     (tagihan_id, tipe, nama, qty, harga_satuan, subtotal, referensi)
                     VALUES (?, ?, ?, ?, ?, ?, ?)'
                );
                foreach ($items as $it) {
                    $bindTagihanId = $tagihanId;
                    $bindTipe      = $it['tipe'];
                    $bindNama      = $it['nama'];
                    $bindQty       = (int)$it['qty'];
                    $bindHarga     = (float)$it['harga_satuan'];
                    $bindSubtotal  = (float)$it['subtotal'];
                    $bindRef       = $it['referensi'] ?? null;
                    $stmt->bind_param('issidss',
                        $bindTagihanId, $bindTipe, $bindNama,
                        $bindQty, $bindHarga, $bindSubtotal, $bindRef
                    );
                    $stmt->execute();
                }
                $stmt->close();
            }

            $conn->commit();
        } catch (Throwable $e) {
            $conn->rollback();
            error_log('buatTagihanOtomatis refresh: ' . $e->getMessage());
            return 0;
        }

        return $tagihanId;
    }

    // ---- Belum ada & tidak ada item → jangan buat ----
    if (count($items) === 0) return 0;

    // Generate no_tagihan
    $prefix = 'INV-' . date('Ymd') . '-';
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS c FROM tagihan WHERE no_tagihan LIKE CONCAT(?, '%')"
    );
    $stmt->bind_param('s', $prefix);
    $stmt->execute();
    $count = (int)$stmt->get_result()->fetch_assoc()['c'];
    $stmt->close();
    $noTagihan = $prefix . str_pad((string)($count + 1), 3, '0', STR_PAD_LEFT);

    $uid = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;

    $conn->begin_transaction();
    try {
        $bindNoTagihan = $noTagihan;
        $bindPid       = $pendaftaranId;
        $bindPasienId  = $pasienId;
        $bindTotal     = $total;
        $bindUid       = $uid;
        $stmt = $conn->prepare(
            'INSERT INTO tagihan
             (no_tagihan, pendaftaran_id, pasien_id, total, status, created_by)
             VALUES (?, ?, ?, ?, "belum_bayar", ?)'
        );
        $stmt->bind_param('siidi',
            $bindNoTagihan, $bindPid, $bindPasienId, $bindTotal, $bindUid
        );
        $stmt->execute();
        $tagihanId = $stmt->insert_id;
        $stmt->close();

        $stmt = $conn->prepare(
            'INSERT INTO tagihan_item
             (tagihan_id, tipe, nama, qty, harga_satuan, subtotal, referensi)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        foreach ($items as $it) {
            $bindTagihanId = $tagihanId;
            $bindTipe      = $it['tipe'];
            $bindNama      = $it['nama'];
            $bindQty       = (int)$it['qty'];
            $bindHarga     = (float)$it['harga_satuan'];
            $bindSubtotal  = (float)$it['subtotal'];
            $bindRef       = $it['referensi'] ?? null;
            $stmt->bind_param('issidss',
                $bindTagihanId, $bindTipe, $bindNama,
                $bindQty, $bindHarga, $bindSubtotal, $bindRef
            );
            $stmt->execute();
        }
        $stmt->close();

        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        error_log('buatTagihanOtomatis create: ' . $e->getMessage());
        return 0;
    }

    return $tagihanId;
}


function hitungTagihanLive(mysqli $conn, int $pid): array
{
    $items = [];

    // 1. Konsultasi dokter
    $stmt = $conn->prepare(
        "SELECT d.nama AS dokter_nama, d.spesialis, d.tarif_konsultasi
         FROM pendaftaran p
         JOIN dokter d ON d.id = p.dokter_id
         WHERE p.id = ? LIMIT 1"
    );
    $stmt->bind_param('i', $pid);
    $stmt->execute();
    $dok = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($dok && (float)$dok['tarif_konsultasi'] > 0) {
        $items[] = [
            'tipe'         => 'konsultasi',
            'nama'         => 'Konsultasi ' . $dok['dokter_nama'] . ' (' . $dok['spesialis'] . ')',
            'qty'          => 1,
            'harga_satuan' => (float)$dok['tarif_konsultasi'],
            'subtotal'     => (float)$dok['tarif_konsultasi'],
            'referensi'    => 'pendaftaran:' . $pid,
        ];
    }

    // 2. Tindakan medis
    $stmt = $conn->prepare(
        "SELECT tm.id, tm.nama_tindakan, tm.biaya
         FROM tindakan_medis tm
         JOIN rekam_medis rm ON rm.id = tm.rekam_medis_id
         WHERE rm.pendaftaran_id = ? AND tm.biaya > 0"
    );
    $stmt->bind_param('i', $pid);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    foreach ($rows as $r) {
        $items[] = [
            'tipe'         => 'tindakan',
            'nama'         => $r['nama_tindakan'],
            'qty'          => 1,
            'harga_satuan' => (float)$r['biaya'],
            'subtotal'     => (float)$r['biaya'],
            'referensi'    => 'tindakan_medis:' . $r['id'],
        ];
    }

    // 3. Obat (resep yang sudah disiapkan/diserahkan)
    $stmt = $conn->prepare(
        "SELECT ri.id, ri.nama_obat, COALESCE(o.harga, 0) AS harga
         FROM resep_item ri
         JOIN resep r ON r.id = ri.resep_id
         JOIN rekam_medis rm ON rm.id = r.rekam_medis_id
         LEFT JOIN master_obat o ON o.id = ri.obat_id
         WHERE rm.pendaftaran_id = ?
           AND r.status IN ('disiapkan','diserahkan')
         ORDER BY ri.id ASC"
    );
    $stmt->bind_param('i', $pid);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    foreach ($rows as $r) {
        if ((float)$r['harga'] <= 0) continue;
        $items[] = [
            'tipe'         => 'obat',
            'nama'         => $r['nama_obat'],
            'qty'          => 1,
            'harga_satuan' => (float)$r['harga'],
            'subtotal'     => (float)$r['harga'],
            'referensi'    => 'resep_item:' . $r['id'],
        ];
    }

    // 4. Lab (permintaan yang sudah selesai)
    $stmt = $conn->prepare(
        "SELECT pl.id, pl.nama_lab, COALESCE(ml.harga, 0) AS harga
         FROM permintaan_lab pl
         JOIN rekam_medis rm ON rm.id = pl.rekam_medis_id
         LEFT JOIN master_lab ml ON ml.id = pl.lab_id
         WHERE rm.pendaftaran_id = ?
           AND pl.status = 'selesai'"
    );
    $stmt->bind_param('i', $pid);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    foreach ($rows as $r) {
        if ((float)$r['harga'] <= 0) continue;
        $items[] = [
            'tipe'         => 'lab',
            'nama'         => $r['nama_lab'],
            'qty'          => 1,
            'harga_satuan' => (float)$r['harga'],
            'subtotal'     => (float)$r['harga'],
            'referensi'    => 'permintaan_lab:' . $r['id'],
        ];
    }

    return $items;
}