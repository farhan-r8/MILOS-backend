const db = require('../config/db');

let hasEnsuredTransactionSchema = false;

const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
        if (err) {
            reject(err);
            return;
        }
        resolve(result);
    });
});

const ensureColumnExists = async ({ tableName, columnName, definition }) => {
    const rows = await runQuery(
        `
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
            LIMIT 1
        `,
        [tableName, columnName]
    );

    if (Array.isArray(rows) && rows.length > 0) {
        return;
    }

    await runQuery(`
        ALTER TABLE ${tableName}
        ADD COLUMN ${columnName} ${definition}
    `);
};

const ensureTransactionSchema = async () => {
    if (hasEnsuredTransactionSchema) return;

    await ensureColumnExists({
        tableName: 'transaksi',
        columnName: 'catatan',
        definition: 'TEXT NULL'
    });

    hasEnsuredTransactionSchema = true;
};

module.exports = {
    ensureTransactionSchema
};
