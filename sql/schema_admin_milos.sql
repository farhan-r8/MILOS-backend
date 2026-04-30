-- =========================================================
-- Skema Inti MILOS - Role Admin/Pengurus
-- MySQL 8+
-- =========================================================

CREATE DATABASE IF NOT EXISTS milos_db;
USE milos_db;

-- 1) USERS: membedakan admin dan nasabah
CREATE TABLE IF NOT EXISTS users (
    id_user BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'nasabah') NOT NULL DEFAULT 'nasabah',
    phone VARCHAR(30) NULL,
    address TEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2) JENIS SAMPAH: master data + poin per satuan
CREATE TABLE IF NOT EXISTS jenis_sampah (
    id_jenis BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama_jenis VARCHAR(120) NOT NULL UNIQUE,
    satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
    poin_per_satuan INT UNSIGNED NOT NULL,
    is_aktif TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3) TRANSAKSI: diverifikasi admin, dicatat per user
CREATE TABLE IF NOT EXISTS transaksi (
    id_transaksi BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_user BIGINT UNSIGNED NOT NULL,
    id_admin_verifikator BIGINT UNSIGNED NULL,
    tanggal_transaksi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_berat_kg DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_poin INT UNSIGNED NOT NULL DEFAULT 0,
    status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    catatan TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaksi_user
        FOREIGN KEY (id_user) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_transaksi_admin
        FOREIGN KEY (id_admin_verifikator) REFERENCES users(id_user)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_transaksi_status ON transaksi(status);
CREATE INDEX idx_transaksi_tanggal ON transaksi(tanggal_transaksi);

-- Seed minimal role admin
-- NOTE: ganti password_hash dengan hash asli (bcrypt/argon2) saat implementasi produksi.
INSERT INTO users (nama, email, password_hash, role)
SELECT 'Admin MILOS', 'admin@milos.id', '$2b$10$replace-with-real-hash', 'admin'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@milos.id'
);
