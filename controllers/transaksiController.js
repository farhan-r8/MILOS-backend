const db = require('../config/db');
const { emitNotification } = require('../utils/realtime');

const mapMetode = (metode) => {
    if (!metode) return 'Drop-off';
    const normalized = String(metode).toLowerCase();
    if (normalized === 'pickup') return 'Pickup';
    return 'Drop-off';
};

const formatTransaksiRow = (row) => ({
    id: `TRX-${String(row.id_transaksi).padStart(3, '0')}`,
    rawId: row.id_transaksi,
    userId: String(row.id_user),
    customerId: `CST-${String(row.id_user).padStart(3, '0')}`,
    customerName: row.nama,
    date: row.tanggal,
    weight: Number(row.total_berat || 0),
    totalPoints: Number(row.total_poin || 0),
    points: Number(row.total_poin || 0),
    pointsPerKg: Number(row.points_per_kg || 0),
    status: row.status,
    method: row.metode === 'Pickup' ? 'Pickup' : 'Drop-off',
    notes: row.catatan || '',
    wasteType: row.waste_types || 'Tidak diketahui',
    wasteTypes: row.waste_types
        ? row.waste_types.split(',').map((item) => item.trim()).filter(Boolean)
        : []
});

exports.createTransaksi = (req, res) => {
    const authUserId = req.authUser?.id;
    const id_user = req.body.id_user || req.body.userId || authUserId;
    const id_pengurus = req.body.id_pengurus || req.body.adminId || null;
    const metode = mapMetode(req.body.metode || req.body.method);
    const catatan = req.body.catatan || req.body.notes || null;

    if (!id_user) {
        return res.status(400).json({
            message: 'Field wajib: id_user/userId'
        });
    }

    const sql = `
        INSERT INTO transaksi (id_user, id_pengurus, tanggal, status, metode, catatan)
        VALUES (?, ?, NOW(), 'pending', ?, ?)
    `;

    db.query(sql, [id_user, id_pengurus, metode, catatan], (err, result) => {
        if (err) return res.status(500).json(err);

        emitNotification({
            role: 'admin',
            title: 'Transaksi baru masuk',
            message: `Ada transaksi ${metode} baru yang menunggu verifikasi admin.`,
            entity: 'transaction',
            payload: {
                transactionId: result.insertId,
                userId: String(id_user)
            }
        });

        return res.status(201).json({
            message: 'Transaksi berhasil dibuat',
            id_transaksi: result.insertId,
            transactionId: result.insertId
        });
    });
};

exports.tambahDetail = (req, res) => {
    const id_transaksi = req.body.id_transaksi || req.body.transactionId;
    const id_jenis = req.body.id_jenis || req.body.wasteTypeId;
    const berat = Number(req.body.berat || req.body.weight || 0);

    if (!id_transaksi || !id_jenis || !berat) {
        return res.status(400).json({
            message: 'Field wajib: id_transaksi/transactionId, id_jenis/wasteTypeId, berat/weight'
        });
    }

    const getPoin = 'SELECT nama_jenis, poin_per_satuan FROM jenis_sampah WHERE id_jenis = ?';

    db.query(getPoin, [id_jenis], (err, result) => {
        if (err) return res.status(500).json(err);

        if (!result || result.length === 0) {
            return res.status(404).json({ message: 'Jenis sampah tidak ditemukan' });
        }

        const poinPerSatuan = Number(result[0].poin_per_satuan || 0);
        const totalPoin = berat * poinPerSatuan;

        const insert = `
            INSERT INTO detail_transaksi (id_transaksi, id_jenis, berat, poin)
            VALUES (?, ?, ?, ?)
        `;

        db.query(insert, [id_transaksi, id_jenis, berat, totalPoin], (err2) => {
            if (err2) return res.status(500).json(err2);

            return res.json({
                message: 'Detail berhasil ditambahkan',
                poin: totalPoin,
                points: totalPoin,
                pointsPerKg: poinPerSatuan,
                wasteType: result[0].nama_jenis
            });
        });
    });
};

exports.getTransaksi = (req, res) => {
    const { userId } = req.query;
    const whereClause = userId ? 'WHERE t.id_user = ?' : '';
    const params = userId ? [userId] : [];

    db.query(
        `
        SELECT 
            t.id_transaksi,
            t.id_user,
            u.nama,
            t.tanggal,
            t.status,
            t.metode,
            t.catatan,
            COALESCE(SUM(d.berat), 0) AS total_berat,
            COALESCE(SUM(d.poin), 0) AS total_poin,
            COALESCE(ROUND(SUM(d.poin) / NULLIF(SUM(d.berat), 0)), 0) AS points_per_kg,
            GROUP_CONCAT(DISTINCT js.nama_jenis ORDER BY js.nama_jenis SEPARATOR ', ') AS waste_types
        FROM transaksi t
        JOIN user u ON t.id_user = u.id_user
        LEFT JOIN detail_transaksi d ON d.id_transaksi = t.id_transaksi
        LEFT JOIN jenis_sampah js ON js.id_jenis = d.id_jenis
        ${whereClause}
        GROUP BY t.id_transaksi, t.id_user, u.nama, t.tanggal, t.status, t.metode, t.catatan
        ORDER BY t.tanggal DESC
        `,
        params,
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.json(result.map(formatTransaksiRow));
        }
    );
};

exports.getWasteTypes = (_req, res) => {
    const mapWasteTypes = (rows) =>
        rows.map((row) => ({
            id: String(row.id_jenis),
            value: String(row.id_jenis),
            label: row.nama_jenis,
            unit: row.satuan || 'kg',
            pointsPerKg: Number(row.poin_per_satuan || 0)
        }));

    db.query(
        `
        SELECT id_jenis, nama_jenis, satuan, poin_per_satuan, is_aktif
        FROM jenis_sampah
        WHERE is_aktif = 1
        ORDER BY nama_jenis ASC
        `,
        (err, result) => {
            if (err) return res.status(500).json(err);

            if (result && result.length > 0) {
                return res.json(mapWasteTypes(result));
            }

            db.query(
                `
                SELECT id_jenis, nama_jenis, satuan, poin_per_satuan, is_aktif
                FROM jenis_sampah
                ORDER BY nama_jenis ASC
                `,
                (fallbackErr, fallbackResult) => {
                    if (fallbackErr) return res.status(500).json(fallbackErr);
                    return res.json(mapWasteTypes(fallbackResult || []));
                }
            );
        }
    );
};

exports.verifyTransaksi = (req, res) => {
    const { id } = req.params;
    const id_pengurus = req.authUser?.id;
    const { status, weight, wasteTypeId, condition } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status verifikasi hanya: verified/rejected' });
    }

    const processVerification = (catatanTambahan = null) => {
        const sql = `
            UPDATE transaksi
            SET status = ?, id_pengurus = ?, catatan = COALESCE(?, catatan)
            WHERE id_transaksi = ?
        `;
        db.query(sql, [status, id_pengurus, catatanTambahan, id], (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
            }

            db.query(
                'SELECT id_user FROM transaksi WHERE id_transaksi = ? LIMIT 1',
                [id],
                (fetchErr, rows) => {
                    if (!fetchErr && rows && rows.length > 0) {
                        emitNotification({
                            userId: String(rows[0].id_user),
                            title: 'Status transaksi diperbarui',
                            message:
                                status === 'verified'
                                    ? 'Transaksi Anda telah diverifikasi dan poin sudah dihitung.'
                                    : 'Transaksi Anda ditolak oleh admin.',
                            entity: 'transaction',
                            payload: {
                                transactionId: Number(id),
                                status
                            }
                        });
                    }

                    emitNotification({
                        role: 'admin',
                        title: 'Transaksi diproses',
                        message: `Transaksi #${id} berhasil diperbarui menjadi ${status}.`,
                        entity: 'transaction',
                        payload: {
                            transactionId: Number(id),
                            status
                        }
                    });

                    return res.json({ message: 'Status transaksi berhasil diverifikasi' });
                }
            );
        });
    };

    if (status === 'verified' && weight && wasteTypeId) {
        const getPoin = 'SELECT poin_per_satuan FROM jenis_sampah WHERE id_jenis = ?';
        db.query(getPoin, [wasteTypeId], (err, result) => {
            if (err) return res.status(500).json(err);
            if (!result || result.length === 0) {
                return res.status(404).json({ message: 'Jenis sampah tidak ditemukan' });
            }

            const poinPerSatuan = Number(result[0].poin_per_satuan || 0);
            const multiplier = condition === 'Basah' ? 0.6 : 1.0;
            const totalPoin = Math.floor(weight * poinPerSatuan * multiplier);

            // Update or Insert detail_transaksi
            db.query('SELECT id_detail FROM detail_transaksi WHERE id_transaksi = ? LIMIT 1', [id], (err2, details) => {
                if (err2) return res.status(500).json(err2);

                if (details.length > 0) {
                    const updateDetail = 'UPDATE detail_transaksi SET id_jenis = ?, berat = ?, poin = ? WHERE id_transaksi = ?';
                    db.query(updateDetail, [wasteTypeId, weight, totalPoin, id], (err3) => {
                        if (err3) return res.status(500).json(err3);
                        processVerification(condition ? `Kondisi: ${condition}` : null);
                    });
                } else {
                    const insertDetail = 'INSERT INTO detail_transaksi (id_transaksi, id_jenis, berat, poin) VALUES (?, ?, ?, ?)';
                    db.query(insertDetail, [id, wasteTypeId, weight, totalPoin], (err3) => {
                        if (err3) return res.status(500).json(err3);
                        processVerification(condition ? `Kondisi: ${condition}` : null);
                    });
                }
            });
        });
    } else {
        processVerification();
    }
};

exports.getLaporanSummary = (_req, res) => {
    db.query(
        `
        SELECT 
            COUNT(DISTINCT t.id_transaksi) AS total_transaksi,
            COALESCE(SUM(CASE WHEN t.status = 'verified' THEN 1 ELSE 0 END), 0) AS total_verified,
            COALESCE(SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END), 0) AS total_pending,
            COALESCE(SUM(CASE WHEN t.status = 'rejected' THEN 1 ELSE 0 END), 0) AS total_rejected,
            COALESCE(SUM(d.berat), 0) AS total_berat,
            COALESCE(SUM(d.poin), 0) AS total_poin
        FROM transaksi t
        LEFT JOIN detail_transaksi d ON d.id_transaksi = t.id_transaksi
        `,
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.json(result[0] || {});
        }
    );
};
