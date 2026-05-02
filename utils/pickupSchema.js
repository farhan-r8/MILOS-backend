const db = require('../config/db');

const runQuery = (sql) =>
    new Promise((resolve, reject) => {
        db.query(sql, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });

exports.ensurePickupSchema = async () => {
    await runQuery(`
        ALTER TABLE pengajuan_pickup
        ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,6) NULL AFTER alamat
    `);

    await runQuery(`
        ALTER TABLE pengajuan_pickup
        ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,6) NULL AFTER latitude
    `);

    await runQuery(`
        ALTER TABLE pengajuan_pickup
        ADD COLUMN IF NOT EXISTS alamat_tergeocode TEXT NULL AFTER longitude
    `);
};
