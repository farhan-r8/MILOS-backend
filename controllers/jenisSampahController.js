const db = require('../config/db');

const mapRow = (row) => ({
    id: row.id_jenis,
    nama: row.nama_jenis,
    satuan: row.satuan,
    poinPerSatuan: Number(row.poin_per_satuan),
    isAktif: Boolean(row.is_aktif),
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

exports.getAllJenisSampah = (_req, res) => {
    db.query(
        `SELECT id_jenis, nama_jenis, satuan, poin_per_satuan, is_aktif, created_at, updated_at
         FROM jenis_sampah
         ORDER BY id_jenis DESC`,
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.json(result.map(mapRow));
        }
    );
};

exports.getJenisSampahById = (req, res) => {
    const { id } = req.params;
    db.query(
        `SELECT id_jenis, nama_jenis, satuan, poin_per_satuan, is_aktif, created_at, updated_at
         FROM jenis_sampah
         WHERE id_jenis = ? LIMIT 1`,
        [id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (!result || result.length === 0) {
                return res.status(404).json({ message: 'Jenis sampah tidak ditemukan' });
            }
            return res.json(mapRow(result[0]));
        }
    );
};

exports.createJenisSampah = (req, res) => {
    const nama = req.body.nama || req.body.nama_jenis;
    const satuan = req.body.satuan || 'kg';
    const poinPerSatuan = Number(req.body.poinPerSatuan ?? req.body.poin_per_satuan);

    if (!nama || Number.isNaN(poinPerSatuan)) {
        return res.status(400).json({
            message: 'Field wajib: nama/nama_jenis dan poinPerSatuan/poin_per_satuan'
        });
    }

    const sql = `
        INSERT INTO jenis_sampah (nama_jenis, satuan, poin_per_satuan, is_aktif)
        VALUES (?, ?, ?, 1)
    `;
    db.query(sql, [nama, satuan, poinPerSatuan], (err, result) => {
        if (err) return res.status(500).json(err);
        return res.status(201).json({
            message: 'Jenis sampah berhasil ditambahkan',
            id: result.insertId
        });
    });
};

exports.updateJenisSampah = (req, res) => {
    const { id } = req.params;
    const nama = req.body.nama || req.body.nama_jenis;
    const satuan = req.body.satuan;
    const poinPerSatuan = req.body.poinPerSatuan ?? req.body.poin_per_satuan;
    const isAktif = req.body.isAktif ?? req.body.is_aktif;

    const fields = [];
    const values = [];

    if (nama !== undefined) {
        fields.push('nama_jenis = ?');
        values.push(nama);
    }
    if (satuan !== undefined) {
        fields.push('satuan = ?');
        values.push(satuan);
    }
    if (poinPerSatuan !== undefined) {
        const poinParsed = Number(poinPerSatuan);
        if (Number.isNaN(poinParsed)) {
            return res.status(400).json({ message: 'poinPerSatuan harus berupa angka' });
        }
        fields.push('poin_per_satuan = ?');
        values.push(poinParsed);
    }
    if (isAktif !== undefined) {
        fields.push('is_aktif = ?');
        values.push(isAktif ? 1 : 0);
    }

    if (fields.length === 0) {
        return res.status(400).json({ message: 'Tidak ada data yang diupdate' });
    }

    values.push(id);
    const sql = `UPDATE jenis_sampah SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id_jenis = ?`;
    db.query(sql, values, (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Jenis sampah tidak ditemukan' });
        }
        return res.json({ message: 'Jenis sampah berhasil diupdate' });
    });
};

exports.deleteJenisSampah = (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM jenis_sampah WHERE id_jenis = ?', [id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Jenis sampah tidak ditemukan' });
        }
        return res.json({ message: 'Jenis sampah berhasil dihapus' });
    });
};
