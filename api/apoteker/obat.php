<?php
/**
 * Master obat + stok.
 *
 * GET    ?q=             → list obat
 * GET    ?id=X           → detail obat
 * POST   { nama, satuan, harga?, keterangan? }          → tambah obat baru
 * PUT    { id, nama?, satuan?, harga?, keterangan?, aktif? } → edit
 * PUT    { id, action:'stok_masuk', jumlah, catatan? }  → tambah stok
 * PUT    { id, action:'stok_koreksi', stok_baru, catatan? } → set stok
 * DELETE { id } → nonaktifkan (soft delete)
 */
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

$sess   = requireRole(['apoteker', 'admin']);
$method = $_SERVER['REQUEST_METHOD'];
$uid    = (int)$sess['user_id'];

switch ($method) {

    case 'GET':
        if (!empty($_GET['id'])) {
            $id = (int)$_GET['id'];
            $stmt = $conn->prepare('SELECT * FROM master_obat WHERE id = ? LIMIT 1');
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$row) jsonErr('Obat tidak ditemukan.', 404);
            jsonOk(['obat' => $row]);
        }

        $q = trim((string)($_GET['q'] ?? ''));
        if ($q !== '') {
            $like = '%' . $q . '%';
            $stmt = $conn->prepare(
                'SELECT * FROM master_obat WHERE nama LIKE ? ORDER BY nama ASC'
            );
            $stmt->bind_param('s', $like);
            $stmt->execute();
            $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmt->close();
        } else {
            $rows = $conn->query(
                'SELECT * FROM master_obat ORDER BY nama ASC'
            )->fetch_all(MYSQLI_ASSOC);
        }
        jsonOk(['data' => $rows]);
        break;

    case 'POST':
        $in = jsonInput();
        $nama = strInput($in, 'nama');
        $satuan = strInput($in, 'satuan', 'tablet');
        $harga = isset($in['harga']) && $in['harga'] !== '' ? (float)$in['harga'] : 0;
        $ket = strInput($in, 'keterangan');

        if ($nama === '') jsonErr('Nama obat wajib diisi.', 422);

        $stmt = $conn->prepare(
            'INSERT INTO master_obat (nama, satuan, harga, keterangan, stok, aktif)
             VALUES (?, ?, ?, ?, 0, 1)'
        );
        $stmt->bind_param('ssds', $nama, $satuan, $harga, $ket);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();

        jsonOk(['message' => 'Obat ditambahkan.', 'id' => $id]);
        break;

    case 'PUT':
        $in = jsonInput();
        $id = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID wajib.', 422);

        $action = strInput($in, 'action');

        // ----- Stok masuk -----
        if ($action === 'stok_masuk') {
            $jumlah = (int)($in['jumlah'] ?? 0);
            $catatan = strInput($in, 'catatan');
            if ($jumlah <= 0) jsonErr('Jumlah harus lebih dari 0.', 422);

            $conn->begin_transaction();
            try {
                $stmt = $conn->prepare('SELECT stok FROM master_obat WHERE id = ? FOR UPDATE');
                $stmt->bind_param('i', $id);
                $stmt->execute();
                $row = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                if (!$row) throw new RuntimeException('Obat tidak ditemukan.');

                $sebelum = (int)$row['stok'];
                $sesudah = $sebelum + $jumlah;

                $stmt = $conn->prepare('UPDATE master_obat SET stok = ? WHERE id = ?');
                $stmt->bind_param('ii', $sesudah, $id);
                $stmt->execute();
                $stmt->close();

                $stmt = $conn->prepare(
                    'INSERT INTO obat_mutasi
                     (obat_id, tipe, jumlah, stok_sebelum, stok_sesudah, catatan, created_by)
                     VALUES (?, "masuk", ?, ?, ?, ?, ?)'
                );
                $stmt->bind_param('iiissi',
                    $id, $jumlah, $sebelum, $sesudah, $catatan, $uid
                );
                $stmt->execute();
                $stmt->close();

                $conn->commit();
            } catch (Throwable $e) {
                $conn->rollback();
                jsonErr($e->getMessage() ?: 'Gagal menambah stok.', 500);
            }
            jsonOk(['message' => 'Stok ditambahkan.']);
        }

        // ----- Koreksi stok -----
        if ($action === 'stok_koreksi') {
            $stokBaru = (int)($in['stok_baru'] ?? -1);
            $catatan = strInput($in, 'catatan');
            if ($stokBaru < 0) jsonErr('Stok baru tidak valid.', 422);

            $conn->begin_transaction();
            try {
                $stmt = $conn->prepare('SELECT stok FROM master_obat WHERE id = ? FOR UPDATE');
                $stmt->bind_param('i', $id);
                $stmt->execute();
                $row = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                if (!$row) throw new RuntimeException('Obat tidak ditemukan.');

                $sebelum = (int)$row['stok'];
                $selisih = abs($stokBaru - $sebelum);

                $stmt = $conn->prepare('UPDATE master_obat SET stok = ? WHERE id = ?');
                $stmt->bind_param('ii', $stokBaru, $id);
                $stmt->execute();
                $stmt->close();

                $stmt = $conn->prepare(
                    'INSERT INTO obat_mutasi
                     (obat_id, tipe, jumlah, stok_sebelum, stok_sesudah, catatan, created_by)
                     VALUES (?, "koreksi", ?, ?, ?, ?, ?)'
                );
                $stmt->bind_param('iiissi',
                    $id, $selisih, $sebelum, $stokBaru, $catatan, $uid
                );
                $stmt->execute();
                $stmt->close();

                $conn->commit();
            } catch (Throwable $e) {
                $conn->rollback();
                jsonErr($e->getMessage() ?: 'Gagal koreksi stok.', 500);
            }
            jsonOk(['message' => 'Stok dikoreksi.']);
        }

        // ----- Edit data obat -----
        $nama = strInput($in, 'nama');
        $satuan = strInput($in, 'satuan');
        $harga = isset($in['harga']) && $in['harga'] !== '' ? (float)$in['harga'] : null;
        $ket = array_key_exists('keterangan', $in) ? trim((string)$in['keterangan']) : null;
        $aktif = array_key_exists('aktif', $in) ? (int)!!$in['aktif'] : null;

        // Ambil nilai lama untuk field yang tidak dikirim
        $stmt = $conn->prepare('SELECT * FROM master_obat WHERE id = ? LIMIT 1');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $old = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$old) jsonErr('Obat tidak ditemukan.', 404);

        $nama    = $nama    !== '' ? $nama    : $old['nama'];
        $satuan  = $satuan  !== '' ? $satuan  : $old['satuan'];
        $harga   = $harga   !== null ? $harga : (float)$old['harga'];
        $ket     = $ket     !== null ? $ket   : $old['keterangan'];
        $aktif   = $aktif   !== null ? $aktif : (int)$old['aktif'];

        $stmt = $conn->prepare(
            'UPDATE master_obat SET nama=?, satuan=?, harga=?, keterangan=?, aktif=? WHERE id=?'
        );
        $stmt->bind_param('ssdsii', $nama, $satuan, $harga, $ket, $aktif, $id);
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Obat diperbarui.']);
        break;

    case 'DELETE':
        $in = jsonInput();
        $id = (int)($in['id'] ?? 0);
        if ($id <= 0) jsonErr('ID wajib.', 422);

        // Soft delete
        $stmt = $conn->prepare('UPDATE master_obat SET aktif = 0 WHERE id = ?');
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $stmt->close();

        jsonOk(['message' => 'Obat dinonaktifkan.']);
        break;

    default:
        jsonErr('Method tidak diizinkan.', 405);
}