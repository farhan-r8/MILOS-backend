const db = require('../config/db');

let hasEnsuredTransactionSchema = false;

const runQuery = (sql) => new Promise((resolve, reject) => {
    db.query(sql, (err) => {
        if (err) {
            reject(err);
            return;
        }
        resolve();
    });
});

const ensureTransactionSchema = async () => {
    if (hasEnsuredTransactionSchema) return;

    await runQuery(`
        ALTER TABLE transaksi
        ADD COLUMN IF NOT EXISTS catatan TEXT NULL
    `);

    hasEnsuredTransactionSchema = true;
};

module.exports = {
    ensureTransactionSchema
};
