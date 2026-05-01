CREATE DATABASE IF NOT EXISTS milos_db;
USE milos_db;

CREATE TABLE IF NOT EXISTS user (
    id_user BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'nasabah') NOT NULL DEFAULT 'nasabah',
    phone VARCHAR(30) NULL,
    address TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jenis_sampah (
    id_jenis BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama_jenis VARCHAR(120) NOT NULL UNIQUE,
    satuan VARCHAR(20) NOT NULL DEFAULT 'kg',
    poin_per_satuan INT UNSIGNED NOT NULL,
    is_aktif TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jadwal (
    id_jadwal BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    wilayah VARCHAR(120) NOT NULL,
    hari VARCHAR(20) NOT NULL,
    jam TIME NOT NULL,
    keterangan TEXT NULL,
    is_aktif TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pengajuan_pickup (
    id_pickup BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_user BIGINT UNSIGNED NOT NULL,
    id_jadwal BIGINT UNSIGNED NULL,
    alamat TEXT NULL,
    catatan TEXT NULL,
    status ENUM('pending', 'approved', 'scheduled', 'rejected', 'done') NOT NULL DEFAULT 'pending',
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scheduled_at DATETIME NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pickup_user FOREIGN KEY (id_user) REFERENCES user(id_user) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pickup_jadwal FOREIGN KEY (id_jadwal) REFERENCES jadwal(id_jadwal) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transaksi (
    id_transaksi BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_user BIGINT UNSIGNED NOT NULL,
    id_pengurus BIGINT UNSIGNED NULL,
    tanggal DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
    metode ENUM('Drop-off', 'Pickup') NOT NULL DEFAULT 'Drop-off',
    catatan TEXT NULL,
    CONSTRAINT fk_transaksi_user FOREIGN KEY (id_user) REFERENCES user(id_user) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_transaksi_admin FOREIGN KEY (id_pengurus) REFERENCES user(id_user) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS detail_transaksi (
    id_detail BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_transaksi BIGINT UNSIGNED NOT NULL,
    id_jenis BIGINT UNSIGNED NOT NULL,
    berat DECIMAL(10,2) NOT NULL,
    poin INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_detail_transaksi FOREIGN KEY (id_transaksi) REFERENCES transaksi(id_transaksi) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detail_jenis FOREIGN KEY (id_jenis) REFERENCES jenis_sampah(id_jenis) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS rewards (
    id_reward BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama_reward VARCHAR(150) NOT NULL,
    deskripsi TEXT NULL,
    poin_dibutuhkan INT UNSIGNED NOT NULL,
    stok INT UNSIGNED NOT NULL DEFAULT 0,
    kategori VARCHAR(80) NOT NULL DEFAULT 'Lainnya',
    is_aktif TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
    id_redemption BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_reward BIGINT UNSIGNED NOT NULL,
    id_user BIGINT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    total_poin INT UNSIGNED NOT NULL,
    alamat TEXT NOT NULL,
    catatan TEXT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
    requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    processed_by BIGINT UNSIGNED NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_redemption_reward FOREIGN KEY (id_reward) REFERENCES rewards(id_reward) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_redemption_user FOREIGN KEY (id_user) REFERENCES user(id_user) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_redemption_admin FOREIGN KEY (processed_by) REFERENCES user(id_user) ON UPDATE CASCADE ON DELETE SET NULL
);

INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
SELECT * FROM (
    SELECT 'Tumbler Stainless', 'Tumbler ramah lingkungan kapasitas 500ml', 50000, 15, 'Peralatan', 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM rewards WHERE nama_reward = 'Tumbler Stainless'
);

INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
SELECT * FROM (
    SELECT 'Tas Belanja Kanvas', 'Tas belanja kuat dan tahan lama', 30000, 25, 'Peralatan', 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM rewards WHERE nama_reward = 'Tas Belanja Kanvas'
);

INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
SELECT * FROM (
    SELECT 'Voucher Pulsa 50K', 'Voucher pulsa semua operator', 52000, 50, 'Voucher', 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM rewards WHERE nama_reward = 'Voucher Pulsa 50K'
);

INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
SELECT * FROM (
    SELECT 'Bibit Tanaman Hias', 'Paket 3 bibit tanaman hias', 25000, 20, 'Tanaman', 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM rewards WHERE nama_reward = 'Bibit Tanaman Hias'
);

INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
SELECT * FROM (
    SELECT 'Sedotan Stainless (Set)', 'Set sedotan stainless dengan sikat pembersih', 15000, 30, 'Peralatan', 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM rewards WHERE nama_reward = 'Sedotan Stainless (Set)'
);

INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
SELECT * FROM (
    SELECT 'Kompos Organik 5kg', 'Kompos organik berkualitas untuk tanaman', 20000, 40, 'Pupuk', 1
) AS tmp
WHERE NOT EXISTS (
    SELECT 1 FROM rewards WHERE nama_reward = 'Kompos Organik 5kg'
);
