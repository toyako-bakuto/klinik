<?php
declare(strict_types=1);

require __DIR__  . "/../global/helper.php";

bootSession();

if (empty($_SESSION['user_id'])) {
    jsonOk(['logged_in' => false]);
}

jsonOk([
    'logged_in' => true,
    'role'      => $_SESSION['role'],
    'nama'      => $_SESSION['nama'],
    'redirect'  => redirectForRole($_SESSION['role']),
]);