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

    // Validation: Check if same wilayah, hari, jam already exists
    const checkSql = 'SELECT id_jadwal FROM jadwal WHERE wilayah = ? AND hari = ? AND jam = ? LIMIT 1';
    db.query(checkSql, [wilayah, hari, jam], (checkErr, rows) => {
        if (checkErr) return res.status(500).json(checkErr);
        if (rows.length > 0) {
            return res.status(400).json({ message: 'Jadwal di wilayah ini pada jam tersebut sudah ada' });
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
    });
};

exports.updateJadwal = (req, res) => {
    const { id } = req.params;
    const { wilayah, hari, jam, keterangan, is_aktif } = req.body;

    // Validation: Check clashing schedules excluding current ID
    const checkSql = 'SELECT id_jadwal FROM jadwal WHERE wilayah = ? AND hari = ? AND jam = ? AND id_jadwal != ? LIMIT 1';
    // We need to get current values if some fields are missing from req.body (due to COALESCE in UPDATE)
    // For simplicity, we can fetch the current record or just use the provided values if available.
    // However, if the admin is updating ONLY keterangan, we should still check against current wilayah/hari/jam.
    
    db.query('SELECT wilayah, hari, jam FROM jadwal WHERE id_jadwal = ?', [id], (fetchErr, currentRows) => {
        if (fetchErr) return res.status(500).json(fetchErr);
        if (currentRows.length === 0) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });

        const v_wilayah = wilayah !== undefined ? wilayah : currentRows[0].wilayah;
        const v_hari = hari !== undefined ? hari : currentRows[0].hari;
        const v_jam = jam !== undefined ? jam : currentRows[0].jam;

        db.query(checkSql, [v_wilayah, v_hari, v_jam, id], (checkErr, rows) => {
            if (checkErr) return res.status(500).json(checkErr);
            if (rows.length > 0) {
                return res.status(400).json({ message: 'Jadwal di wilayah ini pada jam tersebut sudah ada' });
            }

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
                    return res.json({ message: 'Jadwal berhasil diupdate' });
                }
            );
        });
    });
};

exports.deleteJadwal = (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM jadwal WHERE id_jadwal = ?', [id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
        return res.json({ message: 'Jadwal berhasil dihapus' });
    });
};
