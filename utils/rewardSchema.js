const db = require('../config/db');

let hasEnsuredRewardSchema = false;

const runQuery = (sql) => new Promise((resolve, reject) => {
    db.query(sql, (err) => {
        if (err) {
            reject(err);
            return;
        }
        resolve();
    });
});

const ensureRewardSchema = async () => {
    if (hasEnsuredRewardSchema) return;

    await runQuery(`
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
        )
    `);

    await runQuery(`
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
        )
    `);

    await runQuery(`
        INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
        SELECT * FROM (
            SELECT 'Tumbler Stainless', 'Tumbler ramah lingkungan kapasitas 500ml', 50000, 15, 'Peralatan', 1
        ) AS tmp
        WHERE NOT EXISTS (
            SELECT 1 FROM rewards WHERE nama_reward = 'Tumbler Stainless'
        )
    `);

    await runQuery(`
        INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
        SELECT * FROM (
            SELECT 'Tas Belanja Kanvas', 'Tas belanja kuat dan tahan lama', 30000, 25, 'Peralatan', 1
        ) AS tmp
        WHERE NOT EXISTS (
            SELECT 1 FROM rewards WHERE nama_reward = 'Tas Belanja Kanvas'
        )
    `);

    await runQuery(`
        INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
        SELECT * FROM (
            SELECT 'Voucher Pulsa 50K', 'Voucher pulsa semua operator', 52000, 50, 'Voucher', 1
        ) AS tmp
        WHERE NOT EXISTS (
            SELECT 1 FROM rewards WHERE nama_reward = 'Voucher Pulsa 50K'
        )
    `);

    await runQuery(`
        INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
        SELECT * FROM (
            SELECT 'Bibit Tanaman Hias', 'Paket 3 bibit tanaman hias', 25000, 20, 'Tanaman', 1
        ) AS tmp
        WHERE NOT EXISTS (
            SELECT 1 FROM rewards WHERE nama_reward = 'Bibit Tanaman Hias'
        )
    `);

    await runQuery(`
        INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
        SELECT * FROM (
            SELECT 'Sedotan Stainless (Set)', 'Set sedotan stainless dengan sikat pembersih', 15000, 30, 'Peralatan', 1
        ) AS tmp
        WHERE NOT EXISTS (
            SELECT 1 FROM rewards WHERE nama_reward = 'Sedotan Stainless (Set)'
        )
    `);

    await runQuery(`
        INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
        SELECT * FROM (
            SELECT 'Kompos Organik 5kg', 'Kompos organik berkualitas untuk tanaman', 20000, 40, 'Pupuk', 1
        ) AS tmp
        WHERE NOT EXISTS (
            SELECT 1 FROM rewards WHERE nama_reward = 'Kompos Organik 5kg'
        )
    `);

    hasEnsuredRewardSchema = true;
};

module.exports = {
    ensureRewardSchema
};
