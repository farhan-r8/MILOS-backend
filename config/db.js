const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'milos_db',
    port: Number(process.env.DB_PORT) || 3306
});

db.connect((err) => {
    if (err) {
        console.log('Database gagal konek:', err);
    } else {
        console.log('Database terkoneksi!');
    }
});

module.exports = db;
