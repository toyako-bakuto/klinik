<?php
/**
 * Pembayaran tagihan.
 *
 * POST   { tagihan_id, metode, nominal, catatan? }   → tambah pembayaran
 * PUT    { id, action:'void', alasan }                → void pembayaran
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['kasir', 'admin']);
$method = $_SERVER['REQUEST_METHOD'];
$uid    = (int)$sess['user_id'];

switch ($method) {

    case 'POST':
        $in = jsonInput();
        $tagihanId = (int)($in['tagihan_id'] ?? 0);
        $metode    = strInput($in, 'metode');
        $nominal   = (float)($in['nominal'] ?? 0);
        $catatan   = strInput($in, 'catatan');

        if ($tagihanId <= 0) jsonErr('tagihan_id wajib.', 422);
        if (!in_array($metode, ['tunai','debit','qris','transfer'], true)) {
            jsonErr('Metode tidak valid.', 422);
        }
        if ($nominal <= 0) jsonErr('Nominal harus > 0.', 422);

        // Ambil tagihan
        $stmt = $conn->prepare('SELECT * FROM tagihan WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $tagihanId);
        $stmt->execute();
        $tagihan = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$tagihan) jsonErr('Tagihan tidak ditemukan.', 404);
        if ($tagihan['status'] === 'dibatalkan') jsonErr('Tagihan sudah dibatalkan.', 409);

        $sisa = (float)$tagihan['total'] - (float)$tagihan['total_bayar'];
        if ($nominal > $sisa + 0.01) {
            jsonErr(sprintf('Nominal melebihi sisa tagihan (sisa: %.2f).', $sisa), 422);
        }

        $conn->begin_transaction();
        try {
            // Insert pembayaran
            $stmt = $conn->prepare(
                'INSERT INTO pembayaran (tagihan_id, metode, nominal, catatan, created_by)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->bind_param('isdsi', $tagihanId, $metode, $nominal, $catatan, $uid);
            $stmt->execute();
            $pembayaranId = $stmt->insert_id;
            $stmt->close();

            // Update total_bayar tagihan (non-void)
            $stmt = $conn->prepare(
                'SELECT COALESCE(SUM(nominal), 0) AS total
                 FROM pembayaran WHERE tagihan_id = ? AND void = 0'
            );
            $stmt->bind_param('i', $tagihanId);
            $stmt->execute();
            $totalBayar = (float)$stmt->get_result()->fetch_assoc()['total'];
            $stmt->close();

            // Tentukan status
            if ($totalBayar + 0.01 >= (float)$tagihan['total']) {
                $status = 'lunas';
            } elseif ($totalBayar > 0) {
                $status = 'sebagian';
            } else {
                $status = 'belum_bayar';
            }

            $stmt = $conn->prepare(
                'UPDATE tagihan SET total_bayar = ?, status = ? WHERE id = ?'
            );
            $stmt->bind_param('dsi', $totalBayar, $status, $tagihanId);
            $stmt->execute();
            $stmt->close();

            $conn->commit();
        } catch (Throwable $e) {
            $conn->rollback();
            jsonErr('Gagal memproses pembayaran: ' . $e->getMessage(), 500);
        }

        jsonOk([
            'message' => 'Pembayaran berhasil.',
            'id'      => $pembayaranId,
            'status'  => $status,
        ]);
        break;

    case 'PUT':
        $in = jsonInput();
        $id = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID wajib.', 422);

        $action = strInput($in, 'action');
        if ($action !== 'void') jsonErr('Aksi tidak dikenal.', 422);

        $alasan = strInput($in, 'alasan');
        if ($alasan === '') jsonErr('Alasan void wajib diisi.', 422);

        // Ambil pembayaran
        $stmt = $conn->prepare('SELECT * FROM pembayaran WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $bayar = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$bayar) jsonErr('Pembayaran tidak ditemukan.', 404);
        if ((int)$bayar['void'] === 1) jsonErr('Pembayaran sudah di-void.', 409);

        $conn->begin_transaction();
        try {
            // Void
            $stmt = $conn->prepare(
                'UPDATE pembayaran
                 SET void = 1, void_alasan = ?, void_by = ?, void_at = NOW()
                 WHERE id = ?'
            );
            $stmt->bind_param('sii', $alasan, $uid, $id);
            $stmt->execute();
            $stmt->close();

            // Hitung ulang
            $stmt = $conn->prepare(
                'SELECT COALESCE(SUM(nominal), 0) AS total
                 FROM pembayaran WHERE tagihan_id = ? AND void = 0'
            );
            $stmt->bind_param('i', $bayar['tagihan_id']);
            $stmt->execute();
            $totalBayar = (float)$stmt->get_result()->fetch_assoc()['total'];
            $stmt->close();

            $stmt = $conn->prepare('SELECT total FROM tagihan WHERE id = ?');
            $stmt->bind_param('i', $bayar['tagihan_id']);
            $stmt->execute();
            $totalTagihan = (float)$stmt->get_result()->fetch_assoc()['total'];
            $stmt->close();

            if ($totalBayar + 0.01 >= $totalTagihan) {
                $status = 'lunas';
            } elseif ($totalBayar > 0) {
                $status = 'sebagian';
            } else {
                $status = 'belum_bayar';
            }

            $stmt = $conn->prepare(
                'UPDATE tagihan SET total_bayar = ?, status = ? WHERE id = ?'
            );
            $stmt->bind_param('dsi', $totalBayar, $status, $bayar['tagihan_id']);
            $stmt->execute();
            $stmt->close();

            $conn->commit();
        } catch (Throwable $e) {
            $conn->rollback();
            jsonErr('Gagal void pembayaran: ' . $e->getMessage(), 500);
        }

        jsonOk(['message' => 'Pembayaran di-void.', 'status' => $status]);
        break;

    default:
        jsonErr('Method tidak diizinkan.', 405);
}