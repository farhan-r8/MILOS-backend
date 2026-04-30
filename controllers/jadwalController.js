const db = require('../config/db');

exports.getJadwal = (_req, res) => {
    db.query(
        `SELECT id_jadwal, wilayah, hari, jam, keterangan, is_aktif, created_at, updated_at
         FROM jadwal
         ORDER BY id_jadwal DESC`,
        (err, rows) => {
            if (err) return res.status(500).json(err);
            return res.json(rows);
        }
    );
};

exports.createJadwal = (req, res) => {
    const { wilayah, hari, jam, keterangan } = req.body;
    if (!wilayah || !hari || !jam) {
        return res.status(400).json({ message: 'Field wajib: wilayah, hari, jam' });
    }

    db.query(
        `INSERT INTO jadwal (wilayah, hari, jam, keterangan, is_aktif)
         VALUES (?, ?, ?, ?, 1)`,
        [wilayah, hari, jam, keterangan || null],
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.status(201).json({ message: 'Jadwal berhasil dibuat', id_jadwal: result.insertId });
        }
    );
};

exports.updateJadwal = (req, res) => {
    const { id } = req.params;
    const { wilayah, hari, jam, keterangan, is_aktif } = req.body;
    db.query(
        `UPDATE jadwal
         SET wilayah = COALESCE(?, wilayah),
             hari = COALESCE(?, hari),
             jam = COALESCE(?, jam),
             keterangan = COALESCE(?, keterangan),
             is_aktif = COALESCE(?, is_aktif),
             updated_at = CURRENT_TIMESTAMP
         WHERE id_jadwal = ?`,
        [wilayah, hari, jam, keterangan, is_aktif, id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
            return res.json({ message: 'Jadwal berhasil diupdate' });
        }
    );
};

exports.deleteJadwal = (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM jadwal WHERE id_jadwal = ?', [id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
        return res.json({ message: 'Jadwal berhasil dihapus' });
    });
};
