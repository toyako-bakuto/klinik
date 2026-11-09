-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 07, 2026 at 10:03 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `klinik_sehat`
--

-- --------------------------------------------------------

--
-- Table structure for table `antrean`
--

CREATE TABLE `antrean` (
  `id` int(11) NOT NULL,
  `pendaftaran_id` int(11) NOT NULL,
  `no_antrean` varchar(10) NOT NULL,
  `estimasi` time DEFAULT NULL,
  `status` enum('menunggu','menunggu_dokter','diperiksa','menunggu_lab','selesai','batal') NOT NULL DEFAULT 'menunggu',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `antrean`
--

INSERT INTO `antrean` (`id`, `pendaftaran_id`, `no_antrean`, `estimasi`, `status`, `created_at`) VALUES
(1, 1, 'A-001', NULL, 'selesai', '2026-11-06 13:37:28'),
(2, 2, 'A-001', NULL, 'selesai', '2026-11-07 07:25:07');

-- --------------------------------------------------------

--
-- Table structure for table `dokter`
--

CREATE TABLE `dokter` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `spesialis` varchar(50) NOT NULL,
  `no_sip` varchar(50) DEFAULT NULL,
  `telepon` varchar(20) DEFAULT NULL,
  `tarif_konsultasi` decimal(12,2) NOT NULL DEFAULT 0.00,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dokter`
--

INSERT INTO `dokter` (`id`, `nama`, `spesialis`, `no_sip`, `telepon`, `tarif_konsultasi`, `user_id`, `created_at`) VALUES
(1, 'dr. Maya Putri', 'Umum', 'SIP-001/2024', '0812-1111-1111', 50000.00, 4, '2026-11-06 10:48:21'),
(2, 'drg. Rudi Hartono', 'Gigi', 'SIP-002/2024', '0812-2222-2222', 50000.00, NULL, '2026-11-06 10:48:21'),
(3, 'dr. Anisa Rahma', 'Anak', 'SIP-003/2024', '0812-3333-3333', 50000.00, NULL, '2026-11-06 10:48:21');

-- --------------------------------------------------------

--
-- Table structure for table `jadwal_dokter`
--

CREATE TABLE `jadwal_dokter` (
  `id` int(11) NOT NULL,
  `dokter_id` int(11) NOT NULL,
  `hari` enum('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
  `jam_mulai` time NOT NULL,
  `jam_selesai` time NOT NULL,
  `ruang` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `jadwal_dokter`
--

INSERT INTO `jadwal_dokter` (`id`, `dokter_id`, `hari`, `jam_mulai`, `jam_selesai`, `ruang`) VALUES
(1, 1, 'Senin', '08:00:00', '14:00:00', 'R-01'),
(2, 1, 'Selasa', '08:00:00', '14:00:00', 'R-01'),
(3, 1, 'Rabu', '08:00:00', '14:00:00', 'R-01'),
(4, 1, 'Kamis', '08:00:00', '14:00:00', 'R-01'),
(5, 1, 'Jumat', '08:00:00', '14:00:00', 'R-01'),
(6, 2, 'Senin', '09:00:00', '13:00:00', 'R-02'),
(7, 2, 'Selasa', '09:00:00', '13:00:00', 'R-02'),
(8, 2, 'Rabu', '09:00:00', '13:00:00', 'R-02'),
(9, 2, 'Kamis', '09:00:00', '13:00:00', 'R-02'),
(10, 3, 'Rabu', '10:00:00', '16:00:00', 'R-03'),
(11, 3, 'Kamis', '10:00:00', '16:00:00', 'R-03'),
(12, 3, 'Jumat', '10:00:00', '16:00:00', 'R-03'),
(13, 3, 'Sabtu', '10:00:00', '16:00:00', 'R-03');

-- --------------------------------------------------------

--
-- Table structure for table `janji_temu`
--

CREATE TABLE `janji_temu` (
  `id` int(11) NOT NULL,
  `no_janji` varchar(20) NOT NULL,
  `pasien_id` int(11) NOT NULL,
  `dokter_id` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `jam` time NOT NULL,
  `keperluan` text DEFAULT NULL,
  `status` enum('dijadwalkan','dikonfirmasi','dibatalkan','selesai') NOT NULL DEFAULT 'dijadwalkan',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `master_lab`
--

CREATE TABLE `master_lab` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `harga` decimal(12,2) NOT NULL DEFAULT 0.00,
  `jenis_sampel` enum('darah','urin','feses','swab','sputum','lain') NOT NULL DEFAULT 'darah'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `master_lab`
--

INSERT INTO `master_lab` (`id`, `nama`, `harga`, `jenis_sampel`) VALUES
(1, 'Darah Lengkap', 75000.00, 'darah'),
(2, 'Gula Darah Sewaktu', 75000.00, 'darah'),
(3, 'Gula Darah Puasa', 75000.00, 'darah'),
(4, 'Kolesterol Total', 75000.00, 'darah'),
(5, 'Asam Urat', 75000.00, 'darah'),
(6, 'Fungsi Hati (SGOT/SGPT)', 75000.00, 'darah'),
(7, 'Fungsi Ginjal (Ureum/Creatinin)', 75000.00, 'darah'),
(8, 'Urinalisis', 75000.00, 'urin'),
(9, 'Widal', 75000.00, 'darah'),
(10, 'Tes Kehamilan', 75000.00, 'urin');

-- --------------------------------------------------------

--
-- Table structure for table `master_obat`
--

CREATE TABLE `master_obat` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `satuan` varchar(30) NOT NULL DEFAULT 'tablet',
  `stok` int(11) NOT NULL DEFAULT 0,
  `harga` decimal(12,2) NOT NULL DEFAULT 0.00,
  `keterangan` text DEFAULT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `master_obat`
--

INSERT INTO `master_obat` (`id`, `nama`, `satuan`, `stok`, `harga`, `keterangan`, `aktif`) VALUES
(1, 'Paracetamol 500 mg', 'tablet', 0, 0.00, NULL, 1),
(2, 'Amoxicillin 500 mg', 'kapsul', 0, 0.00, NULL, 1),
(3, 'Ibuprofen 400 mg', 'tablet', 0, 0.00, NULL, 1),
(4, 'Cetirizine 10 mg', 'tablet', 0, 0.00, NULL, 1),
(5, 'Omeprazole 20 mg', 'kapsul', 0, 0.00, NULL, 1),
(6, 'Metformin 500 mg', 'tablet', 0, 0.00, NULL, 1),
(7, 'Amlodipine 5 mg', 'tablet', 21, 5000.00, '', 1),
(8, 'Salbutamol inhaler', 'inhaler', 0, 0.00, NULL, 1),
(9, 'Dexamethasone 0.5 mg', 'tablet', 0, 0.00, NULL, 1),
(10, 'Antasida sirup', 'botol', 0, 0.00, NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `obat_mutasi`
--

CREATE TABLE `obat_mutasi` (
  `id` int(11) NOT NULL,
  `obat_id` int(11) NOT NULL,
  `tipe` enum('masuk','keluar','koreksi') NOT NULL,
  `jumlah` int(11) NOT NULL,
  `stok_sebelum` int(11) NOT NULL,
  `stok_sesudah` int(11) NOT NULL,
  `referensi` varchar(50) DEFAULT NULL,
  `catatan` varchar(255) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `obat_mutasi`
--

INSERT INTO `obat_mutasi` (`id`, `obat_id`, `tipe`, `jumlah`, `stok_sebelum`, `stok_sesudah`, `referensi`, `catatan`, `created_by`, `created_at`) VALUES
(1, 7, 'masuk', 1, 10, 11, NULL, '', 6, '2026-11-06 14:33:28'),
(2, 7, 'masuk', 12, 11, 23, NULL, '', 6, '2026-11-06 14:33:33'),
(3, 7, 'keluar', 1, 23, 22, 'resep_item:1', 'Penyerahan resep #1', 6, '2026-11-06 14:35:14'),
(4, 7, 'keluar', 1, 22, 21, 'resep_item:2', 'Penyerahan resep #2', 6, '2026-11-07 07:34:59');

-- --------------------------------------------------------

--
-- Table structure for table `pasien`
--

CREATE TABLE `pasien` (
  `id` int(11) NOT NULL,
  `no_rm` varchar(20) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `jenis_kelamin` enum('L','P') NOT NULL,
  `tanggal_lahir` date NOT NULL,
  `telepon` varchar(20) DEFAULT NULL,
  `alamat` text DEFAULT NULL,
  `alergi` text DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pasien`
--

INSERT INTO `pasien` (`id`, `no_rm`, `nama`, `jenis_kelamin`, `tanggal_lahir`, `telepon`, `alamat`, `alergi`, `user_id`, `created_at`) VALUES
(1, 'RM-001', 'Andi Saputra', 'L', '1990-04-12', '0812-3456-7890', 'Jl. Merdeka No. 1', NULL, NULL, '2026-11-06 10:48:21'),
(2, 'RM-002', 'Siti Aminah', 'P', '1988-11-03', '0813-2345-6789', 'Jl. Melati No. 5', NULL, NULL, '2026-11-06 10:48:21'),
(3, 'RM-003', 'Budi Santoso', 'L', '1995-07-21', '0815-8765-4321', 'Jl. Kenanga No. 10', NULL, NULL, '2026-11-06 10:48:21');

-- --------------------------------------------------------

--
-- Table structure for table `pembayaran`
--

CREATE TABLE `pembayaran` (
  `id` int(11) NOT NULL,
  `tagihan_id` int(11) NOT NULL,
  `metode` enum('tunai','debit','qris','transfer') NOT NULL,
  `nominal` decimal(12,2) NOT NULL,
  `catatan` varchar(255) DEFAULT NULL,
  `void` tinyint(1) NOT NULL DEFAULT 0,
  `void_alasan` varchar(255) DEFAULT NULL,
  `void_by` int(11) DEFAULT NULL,
  `void_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pembayaran`
--

INSERT INTO `pembayaran` (`id`, `tagihan_id`, `metode`, `nominal`, `catatan`, `void`, `void_alasan`, `void_by`, `void_at`, `created_by`, `created_at`) VALUES
(1, 1, 'tunai', 145000.00, '', 0, NULL, NULL, NULL, 7, '2026-11-06 14:59:01'),
(2, 2, 'tunai', 155000.00, '', 0, NULL, NULL, NULL, 7, '2026-11-07 07:35:48');

-- --------------------------------------------------------

--
-- Table structure for table `pemeriksaan_awal`
--

CREATE TABLE `pemeriksaan_awal` (
  `id` int(11) NOT NULL,
  `pendaftaran_id` int(11) NOT NULL,
  `perawat_id` int(11) NOT NULL,
  `suhu` decimal(4,1) DEFAULT NULL,
  `sistolik` int(11) DEFAULT NULL,
  `diastolik` int(11) DEFAULT NULL,
  `nadi` int(11) DEFAULT NULL,
  `pernapasan` int(11) DEFAULT NULL,
  `saturasi_oksigen` int(11) DEFAULT NULL,
  `berat_badan` decimal(5,2) DEFAULT NULL,
  `tinggi_badan` decimal(5,2) DEFAULT NULL,
  `keluhan` text DEFAULT NULL,
  `anamnesis` text DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `status` enum('draft','selesai') NOT NULL DEFAULT 'draft',
  `selesai_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pemeriksaan_awal`
--

INSERT INTO `pemeriksaan_awal` (`id`, `pendaftaran_id`, `perawat_id`, `suhu`, `sistolik`, `diastolik`, `nadi`, `pernapasan`, `saturasi_oksigen`, `berat_badan`, `tinggi_badan`, `keluhan`, `anamnesis`, `catatan`, `status`, `selesai_at`, `created_at`, `updated_at`) VALUES
(1, 1, 5, 80.0, 90, 100, 101, 102, 103, 104.00, 105.00, 'sakit gigi', 'alergi obat', 'jangan dikasih obat dulu', 'selesai', '2026-11-06 20:50:12', '2026-11-06 13:37:58', '2026-11-06 13:50:12'),
(2, 2, 5, 1.0, 2, 3, 4, 5, 6, 7.00, 8.00, 'sakit kepala', 'alergi kacang', 'tiidak ada kendala vital', 'selesai', '2026-11-07 14:27:58', '2026-11-07 07:25:46', '2026-11-07 07:27:58');

-- --------------------------------------------------------

--
-- Table structure for table `pendaftaran`
--

CREATE TABLE `pendaftaran` (
  `id` int(11) NOT NULL,
  `no_reg` varchar(20) NOT NULL,
  `pasien_id` int(11) NOT NULL,
  `dokter_id` int(11) NOT NULL,
  `tanggal` date NOT NULL,
  `keluhan` text DEFAULT NULL,
  `status` enum('menunggu','menunggu_dokter','diperiksa','menunggu_lab','selesai','batal') NOT NULL DEFAULT 'menunggu',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pendaftaran`
--

INSERT INTO `pendaftaran` (`id`, `no_reg`, `pasien_id`, `dokter_id`, `tanggal`, `keluhan`, `status`, `created_by`, `created_at`) VALUES
(1, 'REG-20261106-001', 1, 1, '2026-11-06', 'sakit gigi', 'selesai', 1, '2026-11-06 13:37:28'),
(2, 'REG-20261107-001', 3, 1, '2026-11-07', 'sakit kepala', 'selesai', 1, '2026-11-07 07:25:07');

-- --------------------------------------------------------

--
-- Table structure for table `permintaan_lab`
--

CREATE TABLE `permintaan_lab` (
  `id` int(11) NOT NULL,
  `rekam_medis_id` int(11) NOT NULL,
  `nama_lab` varchar(100) NOT NULL,
  `lab_id` int(11) DEFAULT NULL,
  `jenis_sampel` enum('darah','urin','feses','swab','sputum','lain') NOT NULL DEFAULT 'darah',
  `catatan` text DEFAULT NULL,
  `hasil` text DEFAULT NULL,
  `status` enum('diminta','sampel_diambil','diproses','hasil_diinput','divalidasi','ditolak') NOT NULL DEFAULT 'diminta',
  `waktu_diminta` datetime DEFAULT current_timestamp(),
  `waktu_hasil` datetime DEFAULT NULL,
  `sampel_diambil_at` datetime DEFAULT NULL,
  `sampel_diambil_by` int(11) DEFAULT NULL,
  `catatan_sampel` text DEFAULT NULL,
  `hasil_diinput_at` datetime DEFAULT NULL,
  `hasil_diinput_by` int(11) DEFAULT NULL,
  `divalidasi_at` datetime DEFAULT NULL,
  `divalidasi_by` int(11) DEFAULT NULL,
  `nilai_rujukan` text DEFAULT NULL,
  `kesan` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `permintaan_lab`
--

INSERT INTO `permintaan_lab` (`id`, `rekam_medis_id`, `nama_lab`, `lab_id`, `jenis_sampel`, `catatan`, `hasil`, `status`, `waktu_diminta`, `waktu_hasil`, `sampel_diambil_at`, `sampel_diambil_by`, `catatan_sampel`, `hasil_diinput_at`, `hasil_diinput_by`, `divalidasi_at`, `divalidasi_by`, `nilai_rujukan`, `kesan`) VALUES
(1, 1, 'Asam Urat', 5, 'darah', 'cek saja', 'jkajskaj', 'divalidasi', '2026-11-06 20:52:47', '2026-11-06 20:53:53', '2026-11-06 20:53:28', 8, 'aman dan bagus', '2026-11-06 20:53:53', 8, '2026-11-06 20:54:03', 8, 'jaksjakj', 'ajskjakjak'),
(2, 2, 'Asam Urat', 5, 'darah', '', 'aman', 'divalidasi', '2026-11-07 14:30:48', '2026-11-07 14:33:15', '2026-11-07 14:32:51', 8, '1 liter, bagus', '2026-11-07 14:33:15', 8, '2026-11-07 14:33:25', 8, 'tidak ada', 'batas normal');

-- --------------------------------------------------------

--
-- Table structure for table `rekam_medis`
--

CREATE TABLE `rekam_medis` (
  `id` int(11) NOT NULL,
  `pendaftaran_id` int(11) NOT NULL,
  `dokter_id` int(11) NOT NULL,
  `keluhan` text DEFAULT NULL,
  `anamnesis` text DEFAULT NULL,
  `pemeriksaan_fisik` text DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `diagnosis_utama` varchar(255) DEFAULT NULL,
  `diagnosis_kode` varchar(10) DEFAULT NULL,
  `diagnosis_sekunder` text DEFAULT NULL,
  `status` enum('draft','selesai') NOT NULL DEFAULT 'draft',
  `selesai_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rekam_medis`
--

INSERT INTO `rekam_medis` (`id`, `pendaftaran_id`, `dokter_id`, `keluhan`, `anamnesis`, `pemeriksaan_fisik`, `catatan`, `diagnosis_utama`, `diagnosis_kode`, `diagnosis_sekunder`, `status`, `selesai_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'sakit gigi', 'alergi obat', 'sehat', 'orangnya jelek', 'mantap', 'bagus', 'tidak ada', 'selesai', '2026-11-06 20:54:33', '2026-11-06 13:51:33', '2026-11-06 13:54:33'),
(2, 2, 1, 'sakit kepala', 'alergi kacang', 'ada luka di kepala', 'cek kepala', 'terbentur', '', '-', 'selesai', '2026-11-07 14:34:03', '2026-11-07 07:29:14', '2026-11-07 07:34:03');

-- --------------------------------------------------------

--
-- Table structure for table `resep`
--

CREATE TABLE `resep` (
  `id` int(11) NOT NULL,
  `rekam_medis_id` int(11) NOT NULL,
  `catatan` text DEFAULT NULL,
  `status` enum('masuk','diverifikasi','disiapkan','diserahkan','ditolak') NOT NULL DEFAULT 'masuk',
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `catatan_verifikasi` text DEFAULT NULL,
  `disiapkan_by` int(11) DEFAULT NULL,
  `disiapkan_at` datetime DEFAULT NULL,
  `diserahkan_by` int(11) DEFAULT NULL,
  `diserahkan_at` datetime DEFAULT NULL,
  `edukasi` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `resep`
--

INSERT INTO `resep` (`id`, `rekam_medis_id`, `catatan`, `status`, `verified_by`, `verified_at`, `catatan_verifikasi`, `disiapkan_by`, `disiapkan_at`, `diserahkan_by`, `diserahkan_at`, `edukasi`, `created_at`) VALUES
(1, 1, NULL, 'diserahkan', 6, '2026-11-07 21:34:48', 'setelah makan', 6, '2026-11-07 21:34:57', 6, '2026-11-07 21:35:14', 'setelah makan', '2026-11-06 13:52:35'),
(2, 2, NULL, 'diserahkan', 6, '2026-11-07 14:34:31', '', 6, '2026-11-07 14:34:41', 6, '2026-11-07 14:34:59', 'setelah makan', '2026-11-07 07:30:32');

-- --------------------------------------------------------

--
-- Table structure for table `resep_item`
--

CREATE TABLE `resep_item` (
  `id` int(11) NOT NULL,
  `resep_id` int(11) NOT NULL,
  `obat_id` int(11) DEFAULT NULL,
  `nama_obat` varchar(100) NOT NULL,
  `dosis` varchar(50) NOT NULL,
  `frekuensi` varchar(50) NOT NULL,
  `durasi` varchar(50) NOT NULL,
  `instruksi` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `resep_item`
--

INSERT INTO `resep_item` (`id`, `resep_id`, `obat_id`, `nama_obat`, `dosis`, `frekuensi`, `durasi`, `instruksi`) VALUES
(1, 1, 7, 'Amlodipine 5 mg', '500 mg', '3x sehari', '5 hari', 'sesudah makan'),
(2, 2, 7, 'Amlodipine 5 mg', '500 mg', '3x sehari', '7 hari', 'sebelum makan');

-- --------------------------------------------------------

--
-- Table structure for table `tagihan`
--

CREATE TABLE `tagihan` (
  `id` int(11) NOT NULL,
  `no_tagihan` varchar(30) NOT NULL,
  `pendaftaran_id` int(11) NOT NULL,
  `pasien_id` int(11) NOT NULL,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_bayar` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('belum_bayar','sebagian','lunas','dibatalkan') NOT NULL DEFAULT 'belum_bayar',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tagihan`
--

INSERT INTO `tagihan` (`id`, `no_tagihan`, `pendaftaran_id`, `pasien_id`, `total`, `total_bayar`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'INV-20261106-001', 1, 1, 145000.00, 145000.00, 'lunas', 7, '2026-11-06 14:58:48', '2026-11-06 14:59:01'),
(2, 'INV-20261107-001', 2, 3, 155000.00, 155000.00, 'lunas', 8, '2026-11-07 07:33:26', '2026-11-07 07:35:48');

-- --------------------------------------------------------

--
-- Table structure for table `tagihan_item`
--

CREATE TABLE `tagihan_item` (
  `id` int(11) NOT NULL,
  `tagihan_id` int(11) NOT NULL,
  `tipe` enum('konsultasi','tindakan','obat','lab','lain') NOT NULL,
  `nama` varchar(150) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 1,
  `harga_satuan` decimal(12,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `referensi` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tagihan_item`
--

INSERT INTO `tagihan_item` (`id`, `tagihan_id`, `tipe`, `nama`, `qty`, `harga_satuan`, `subtotal`, `referensi`) VALUES
(1, 1, 'konsultasi', 'Konsultasi dr. Maya Putri (Umum)', 1, 50000.00, 50000.00, 'pendaftaran:1'),
(2, 1, 'tindakan', 'nebulasi', 1, 90000.00, 90000.00, 'tindakan_medis:1'),
(3, 1, 'obat', 'Amlodipine 5 mg', 1, 5000.00, 5000.00, 'resep_item:1'),
(6, 2, 'konsultasi', 'Konsultasi dr. Maya Putri (Umum)', 1, 50000.00, 50000.00, 'pendaftaran:2'),
(7, 2, 'tindakan', 'rongent', 1, 100000.00, 100000.00, 'tindakan_medis:3'),
(8, 2, 'obat', 'Amlodipine 5 mg', 1, 5000.00, 5000.00, 'resep_item:2');

-- --------------------------------------------------------

--
-- Table structure for table `tindakan_keperawatan`
--

CREATE TABLE `tindakan_keperawatan` (
  `id` int(11) NOT NULL,
  `pemeriksaan_awal_id` int(11) NOT NULL,
  `nama_tindakan` varchar(100) NOT NULL,
  `keterangan` text DEFAULT NULL,
  `waktu` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tindakan_keperawatan`
--

INSERT INTO `tindakan_keperawatan` (`id`, `pemeriksaan_awal_id`, `nama_tindakan`, `keterangan`, `waktu`) VALUES
(2, 1, 'gulah darah', 'normal', '2026-11-06 20:49:28'),
(3, 1, 'cek mata', 'aman', '2026-11-06 20:50:07'),
(4, 2, 'cek gula darah', 'normal', '2026-11-07 14:27:53');

-- --------------------------------------------------------

--
-- Table structure for table `tindakan_medis`
--

CREATE TABLE `tindakan_medis` (
  `id` int(11) NOT NULL,
  `rekam_medis_id` int(11) NOT NULL,
  `nama_tindakan` varchar(100) NOT NULL,
  `keterangan` text DEFAULT NULL,
  `biaya` decimal(12,2) NOT NULL DEFAULT 0.00,
  `waktu` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tindakan_medis`
--

INSERT INTO `tindakan_medis` (`id`, `rekam_medis_id`, `nama_tindakan`, `keterangan`, `biaya`, `waktu`) VALUES
(1, 1, 'nebulasi', 'normal', 90000.00, '2026-11-06 20:52:12'),
(3, 2, 'rongent', '', 100000.00, '2026-11-07 14:30:06');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `role` enum('admin','resepsionis','dokter','perawat','apoteker','kasir','lab','pasien') NOT NULL DEFAULT 'pasien',
  `aktif` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `nama_lengkap`, `role`, `aktif`, `created_at`) VALUES
(1, 'admin', '$2y$10$0EzbcAFfknAQsf1l9JUu0OxwWMqL5Wjl0VKozuRkKyqIeuRp3qVMy', 'Administrator', 'admin', 1, '2026-11-06 10:48:21'),
(2, 'resepsionis', '$2y$10$0EzbcAFfknAQsf1l9JUu0OxwWMqL5Wjl0VKozuRkKyqIeuRp3qVMy', 'Rina Resepsionis', 'resepsionis', 1, '2026-11-06 10:48:21'),
(3, 'dokter', '$2y$10$0EzbcAFfknAQsf1l9JUu0OxwWMqL5Wjl0VKozuRkKyqIeuRp3qVMy', 'dr. Maya Putri', 'dokter', 1, '2026-11-06 10:48:21'),
(4, 'dokter1', '$2y$10$0EzbcAFfknAQsf1l9JUu0OxwWMqL5Wjl0VKozuRkKyqIeuRp3qVMy', 'dr. Maya Putri', 'dokter', 1, '2026-11-06 10:48:21'),
(5, 'perawat', '$2y$10$0EzbcAFfknAQsf1l9JUu0OxwWMqL5Wjl0VKozuRkKyqIeuRp3qVMy', 'Ns. Dewi Perawat', 'perawat', 1, '2026-11-06 10:48:21'),
(6, 'apoteker', '$2y$10$0EzbcAFfknAQsf1l9JUu0OxwWMqL5Wjl0VKozuRkKyqIeuRp3qVMy', 'Apt. Sari Apoteker', 'apoteker', 1, '2026-11-06 10:48:21'),
(7, 'kasir', '$2y$10$0EzbcAFfknAQsf1l9JUu0OxwWMqL5Wjl0VKozuRkKyqIeuRp3qVMy', 'Rudi Kasir', 'kasir', 1, '2026-11-06 10:48:21'),
(8, 'lab', '$2y$10$0EzbcAFfknAQsf1l9JUu0OxwWMqL5Wjl0VKozuRkKyqIeuRp3qVMy', 'Rina Analis Lab', 'lab', 1, '2026-11-06 10:48:21');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `antrean`
--
ALTER TABLE `antrean`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pendaftaran_id` (`pendaftaran_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `dokter`
--
ALTER TABLE `dokter`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_dokter_user` (`user_id`);

--
-- Indexes for table `jadwal_dokter`
--
ALTER TABLE `jadwal_dokter`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_jadwal_dokter` (`dokter_id`);

--
-- Indexes for table `janji_temu`
--
ALTER TABLE `janji_temu`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `no_janji` (`no_janji`),
  ADD KEY `fk_janji_pasien` (`pasien_id`),
  ADD KEY `fk_janji_dokter` (`dokter_id`),
  ADD KEY `fk_janji_user` (`created_by`),
  ADD KEY `idx_tanggal` (`tanggal`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `master_lab`
--
ALTER TABLE `master_lab`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `master_obat`
--
ALTER TABLE `master_obat`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `obat_mutasi`
--
ALTER TABLE `obat_mutasi`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_mutasi_user` (`created_by`),
  ADD KEY `idx_obat` (`obat_id`),
  ADD KEY `idx_tanggal` (`created_at`);

--
-- Indexes for table `pasien`
--
ALTER TABLE `pasien`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `no_rm` (`no_rm`),
  ADD KEY `fk_pasien_user` (`user_id`);

--
-- Indexes for table `pembayaran`
--
ALTER TABLE `pembayaran`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_bayar_user` (`created_by`),
  ADD KEY `fk_bayar_voidby` (`void_by`),
  ADD KEY `idx_tagihan` (`tagihan_id`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `pemeriksaan_awal`
--
ALTER TABLE `pemeriksaan_awal`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pendaftaran_id` (`pendaftaran_id`),
  ADD KEY `fk_pa_perawat` (`perawat_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `pendaftaran`
--
ALTER TABLE `pendaftaran`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `no_reg` (`no_reg`),
  ADD KEY `fk_daftar_pasien` (`pasien_id`),
  ADD KEY `fk_daftar_dokter` (`dokter_id`),
  ADD KEY `fk_daftar_user` (`created_by`),
  ADD KEY `idx_tanggal` (`tanggal`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `permintaan_lab`
--
ALTER TABLE `permintaan_lab`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_pl_lab` (`lab_id`),
  ADD KEY `fk_pl_ambil` (`sampel_diambil_by`),
  ADD KEY `fk_pl_input` (`hasil_diinput_by`),
  ADD KEY `fk_pl_valid` (`divalidasi_by`),
  ADD KEY `idx_rm` (`rekam_medis_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `rekam_medis`
--
ALTER TABLE `rekam_medis`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pendaftaran_id` (`pendaftaran_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_dokter` (`dokter_id`);

--
-- Indexes for table `resep`
--
ALTER TABLE `resep`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rekam_medis_id` (`rekam_medis_id`),
  ADD KEY `fk_resep_verify` (`verified_by`),
  ADD KEY `fk_resep_siap` (`disiapkan_by`),
  ADD KEY `fk_resep_serah` (`diserahkan_by`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `resep_item`
--
ALTER TABLE `resep_item`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ri_obat` (`obat_id`),
  ADD KEY `idx_resep` (`resep_id`);

--
-- Indexes for table `tagihan`
--
ALTER TABLE `tagihan`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `no_tagihan` (`no_tagihan`),
  ADD UNIQUE KEY `pendaftaran_id` (`pendaftaran_id`),
  ADD KEY `fk_tagihan_pasien` (`pasien_id`),
  ADD KEY `fk_tagihan_user` (`created_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `tagihan_item`
--
ALTER TABLE `tagihan_item`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tagihan` (`tagihan_id`);

--
-- Indexes for table `tindakan_keperawatan`
--
ALTER TABLE `tindakan_keperawatan`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pa` (`pemeriksaan_awal_id`);

--
-- Indexes for table `tindakan_medis`
--
ALTER TABLE `tindakan_medis`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rm` (`rekam_medis_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `antrean`
--
ALTER TABLE `antrean`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `dokter`
--
ALTER TABLE `dokter`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `jadwal_dokter`
--
ALTER TABLE `jadwal_dokter`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `janji_temu`
--
ALTER TABLE `janji_temu`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `master_lab`
--
ALTER TABLE `master_lab`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `master_obat`
--
ALTER TABLE `master_obat`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `obat_mutasi`
--
ALTER TABLE `obat_mutasi`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `pasien`
--
ALTER TABLE `pasien`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `pembayaran`
--
ALTER TABLE `pembayaran`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `pemeriksaan_awal`
--
ALTER TABLE `pemeriksaan_awal`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `pendaftaran`
--
ALTER TABLE `pendaftaran`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `permintaan_lab`
--
ALTER TABLE `permintaan_lab`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `rekam_medis`
--
ALTER TABLE `rekam_medis`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `resep`
--
ALTER TABLE `resep`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `resep_item`
--
ALTER TABLE `resep_item`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tagihan`
--
ALTER TABLE `tagihan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tagihan_item`
--
ALTER TABLE `tagihan_item`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tindakan_keperawatan`
--
ALTER TABLE `tindakan_keperawatan`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tindakan_medis`
--
ALTER TABLE `tindakan_medis`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `antrean`
--
ALTER TABLE `antrean`
  ADD CONSTRAINT `fk_antrian_daftar` FOREIGN KEY (`pendaftaran_id`) REFERENCES `pendaftaran` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `dokter`
--
ALTER TABLE `dokter`
  ADD CONSTRAINT `fk_dokter_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `jadwal_dokter`
--
ALTER TABLE `jadwal_dokter`
  ADD CONSTRAINT `fk_jadwal_dokter` FOREIGN KEY (`dokter_id`) REFERENCES `dokter` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `janji_temu`
--
ALTER TABLE `janji_temu`
  ADD CONSTRAINT `fk_janji_dokter` FOREIGN KEY (`dokter_id`) REFERENCES `dokter` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_janji_pasien` FOREIGN KEY (`pasien_id`) REFERENCES `pasien` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_janji_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `obat_mutasi`
--
ALTER TABLE `obat_mutasi`
  ADD CONSTRAINT `fk_mutasi_obat` FOREIGN KEY (`obat_id`) REFERENCES `master_obat` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mutasi_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pasien`
--
ALTER TABLE `pasien`
  ADD CONSTRAINT `fk_pasien_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pembayaran`
--
ALTER TABLE `pembayaran`
  ADD CONSTRAINT `fk_bayar_tagihan` FOREIGN KEY (`tagihan_id`) REFERENCES `tagihan` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_bayar_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bayar_voidby` FOREIGN KEY (`void_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `pemeriksaan_awal`
--
ALTER TABLE `pemeriksaan_awal`
  ADD CONSTRAINT `fk_pa_pendaftaran` FOREIGN KEY (`pendaftaran_id`) REFERENCES `pendaftaran` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pa_perawat` FOREIGN KEY (`perawat_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `pendaftaran`
--
ALTER TABLE `pendaftaran`
  ADD CONSTRAINT `fk_daftar_dokter` FOREIGN KEY (`dokter_id`) REFERENCES `dokter` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_daftar_pasien` FOREIGN KEY (`pasien_id`) REFERENCES `pasien` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_daftar_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `permintaan_lab`
--
ALTER TABLE `permintaan_lab`
  ADD CONSTRAINT `fk_pl_ambil` FOREIGN KEY (`sampel_diambil_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pl_input` FOREIGN KEY (`hasil_diinput_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pl_lab` FOREIGN KEY (`lab_id`) REFERENCES `master_lab` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pl_rm` FOREIGN KEY (`rekam_medis_id`) REFERENCES `rekam_medis` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pl_valid` FOREIGN KEY (`divalidasi_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `rekam_medis`
--
ALTER TABLE `rekam_medis`
  ADD CONSTRAINT `fk_rm_dokter` FOREIGN KEY (`dokter_id`) REFERENCES `dokter` (`id`),
  ADD CONSTRAINT `fk_rm_pendaftaran` FOREIGN KEY (`pendaftaran_id`) REFERENCES `pendaftaran` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `resep`
--
ALTER TABLE `resep`
  ADD CONSTRAINT `fk_resep_rm` FOREIGN KEY (`rekam_medis_id`) REFERENCES `rekam_medis` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_resep_serah` FOREIGN KEY (`diserahkan_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_resep_siap` FOREIGN KEY (`disiapkan_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_resep_verify` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `resep_item`
--
ALTER TABLE `resep_item`
  ADD CONSTRAINT `fk_ri_obat` FOREIGN KEY (`obat_id`) REFERENCES `master_obat` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ri_resep` FOREIGN KEY (`resep_id`) REFERENCES `resep` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tagihan`
--
ALTER TABLE `tagihan`
  ADD CONSTRAINT `fk_tagihan_pasien` FOREIGN KEY (`pasien_id`) REFERENCES `pasien` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tagihan_pendaftaran` FOREIGN KEY (`pendaftaran_id`) REFERENCES `pendaftaran` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tagihan_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tagihan_item`
--
ALTER TABLE `tagihan_item`
  ADD CONSTRAINT `fk_ti_tagihan` FOREIGN KEY (`tagihan_id`) REFERENCES `tagihan` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tindakan_keperawatan`
--
ALTER TABLE `tindakan_keperawatan`
  ADD CONSTRAINT `fk_tk_pa` FOREIGN KEY (`pemeriksaan_awal_id`) REFERENCES `pemeriksaan_awal` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tindakan_medis`
--
ALTER TABLE `tindakan_medis`
  ADD CONSTRAINT `fk_tm_rm` FOREIGN KEY (`rekam_medis_id`) REFERENCES `rekam_medis` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
