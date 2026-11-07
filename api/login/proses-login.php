<?php
declare(strict_types=1);

require __DIR__ . '/../global/koneksi.php';
require __DIR__ . '/../global/helper.php';

bootSession();

// Wajib POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonErr('Method tidak diizinkan.', 405);
}

$data = jsonInput();

$username = strInput($data, 'username');
$password = (string)($data['password'] ?? '');

if ($username === '' || $password === '') {
    jsonErr('Username dan password wajib diisi.', 422);
}

// Cari User
$stmt = $conn->prepare(
    'SELECT id, username, password, nama_lengkap, role, aktif
     FROM users WHERE username = ? LIMIT 1'
);
$stmt->bind_param('s', $username);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user) {
    jsonErr('Username atau password salah.', 401);
}
if ((int)$user['aktif'] !== 1) {
    jsonErr('Akun dinonaktifkan.', 403);
}
if (!password_verify($password, $user['password'])) {
    jsonErr('Username atau password salah.', 401);
}

// Login sukses
session_regenerate_id(true);

$_SESSION['user_id']       = (int)$user['id'];
$_SESSION['username']      = $user['username'];
$_SESSION['nama']          = $user['nama_lengkap'];
$_SESSION['role']          = $user['role'];
$_SESSION['last_activity'] = time();

jsonOk([
    'message'  => 'Login berhasil.',
    'role'     => $user['role'],
    'nama'     => $user['nama_lengkap'],
    'redirect' => redirectForRole($user['role']),
]);