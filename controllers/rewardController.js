const db = require('../config/db');
const { getAvailablePointsForUser } = require('../utils/points');
const { emitNotification } = require('../utils/realtime');

const mapRewardRow = (row) => ({
    id: Number(row.id_reward),
    name: row.nama_reward,
    description: row.deskripsi || '',
    pointsRequired: Number(row.poin_dibutuhkan || 0),
    stock: Number(row.stok || 0),
    category: row.kategori || 'Lainnya',
    isActive: Boolean(row.is_aktif),
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
});

const mapRedemptionRow = (row) => ({
    id: Number(row.id_redemption),
    rewardId: Number(row.id_reward),
    rewardName: row.nama_reward,
    userId: String(row.id_user),
    userName: row.nama_user,
    userEmail: row.email_user,
    quantity: Number(row.quantity || 0),
    pointsUsed: Number(row.total_poin || 0),
    address: row.alamat,
    notes: row.catatan || '',
    status: row.status,
    requestDate: row.requested_at,
    processedDate: row.processed_at || null,
    processedBy: row.processed_by ? String(row.processed_by) : null,
    processedByName: row.processed_by_name || null
});

exports.getRewards = (_req, res) => {
    db.query(
        `
        SELECT *
        FROM rewards
        WHERE is_aktif = 1
        ORDER BY poin_dibutuhkan ASC, nama_reward ASC
        `,
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.json(result.map(mapRewardRow));
        }
    );
};

exports.getAdminRewards = (_req, res) => {
    db.query(
        `
        SELECT *
        FROM rewards
        ORDER BY created_at DESC, id_reward DESC
        `,
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.json(result.map(mapRewardRow));
        }
    );
};

exports.createReward = (req, res) => {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const pointsRequired = Number(req.body.pointsRequired || 0);
    const stock = Number(req.body.stock || 0);
    const category = String(req.body.category || 'Lainnya').trim() || 'Lainnya';

    if (!name || pointsRequired <= 0 || stock < 0) {
        return res.status(400).json({
            message: 'Field wajib: name, pointsRequired > 0, stock >= 0'
        });
    }

    db.query(
        `
        INSERT INTO rewards (nama_reward, deskripsi, poin_dibutuhkan, stok, kategori, is_aktif)
        VALUES (?, ?, ?, ?, ?, 1)
        `,
        [name, description, pointsRequired, stock, category],
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.status(201).json({
                message: 'Barang hadiah berhasil ditambahkan',
                id: result.insertId
            });
        }
    );
};

exports.updateReward = (req, res) => {
    const { id } = req.params;
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const pointsRequired = Number(req.body.pointsRequired || 0);
    const stock = Number(req.body.stock || 0);
    const category = String(req.body.category || 'Lainnya').trim() || 'Lainnya';
    const isActive = req.body.isActive === undefined ? undefined : Boolean(req.body.isActive);

    if (!name || pointsRequired <= 0 || stock < 0) {
        return res.status(400).json({
            message: 'Field wajib: name, pointsRequired > 0, stock >= 0'
        });
    }

    db.query(
        `
        UPDATE rewards
        SET nama_reward = ?,
            deskripsi = ?,
            poin_dibutuhkan = ?,
            stok = ?,
            kategori = ?,
            is_aktif = COALESCE(?, is_aktif)
        WHERE id_reward = ?
        `,
        [name, description, pointsRequired, stock, category, isActive === undefined ? null : Number(isActive), id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Barang hadiah tidak ditemukan' });
            }
            return res.json({ message: 'Barang hadiah berhasil diperbarui' });
        }
    );
};

exports.deleteReward = (req, res) => {
    const { id } = req.params;

    db.query(
        'UPDATE rewards SET is_aktif = 0 WHERE id_reward = ?',
        [id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Barang hadiah tidak ditemukan' });
            }
            return res.json({ message: 'Barang hadiah berhasil dinonaktifkan' });
        }
    );
};

exports.createRedemption = async (req, res) => {
    const authUserId = req.authUser?.id;
    const authUserRole = req.authUser?.role;
    const { id } = req.params;
    const quantity = Math.max(1, Number(req.body.quantity || 1));
    const address = String(req.body.address || '').trim();
    const notes = String(req.body.notes || '').trim();

    if (!authUserId) {
        return res.status(401).json({ message: 'Sesi login tidak valid' });
    }

    if (authUserRole !== 'nasabah') {
        return res.status(403).json({ message: 'Hanya nasabah yang dapat menukar hadiah' });
    }

    if (!address) {
        return res.status(400).json({ message: 'Alamat pengiriman harus diisi' });
    }

    db.query(
        `
        SELECT *
        FROM rewards
        WHERE id_reward = ? AND is_aktif = 1
        LIMIT 1
        `,
        [id],
        async (rewardErr, rewardRows) => {
            if (rewardErr) return res.status(500).json(rewardErr);
            if (!rewardRows || rewardRows.length === 0) {
                return res.status(404).json({ message: 'Barang hadiah tidak ditemukan' });
            }

            const reward = rewardRows[0];
            if (Number(reward.stok || 0) < quantity) {
                return res.status(400).json({ message: 'Stok barang tidak mencukupi' });
            }

            try {
                const points = await getAvailablePointsForUser(authUserId);
                const totalPoints = Number(reward.poin_dibutuhkan || 0) * quantity;

                if (points.availablePoints < totalPoints) {
                    return res.status(400).json({
                        message: 'Poin Anda tidak mencukupi untuk penukaran ini'
                    });
                }

                db.query(
                    `
                    INSERT INTO reward_redemptions (id_reward, id_user, quantity, total_poin, alamat, catatan, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'pending')
                    `,
                    [id, authUserId, quantity, totalPoints, address, notes || null],
                    (insertErr, insertResult) => {
                        if (insertErr) return res.status(500).json(insertErr);
                        emitNotification({
                            role: 'admin',
                            title: 'Penukaran hadiah baru',
                            message: `Ada permintaan penukaran hadiah baru dari nasabah.`,
                            entity: 'redemption',
                            payload: {
                                redemptionId: insertResult.insertId,
                                rewardId: Number(id),
                                userId: String(authUserId)
                            }
                        });
                        return res.status(201).json({
                            message: 'Permintaan penukaran berhasil dibuat',
                            id: insertResult.insertId
                        });
                    }
                );
            } catch (pointError) {
                return res.status(500).json({
                    message: pointError.message || 'Gagal memvalidasi poin pengguna'
                });
            }
        }
    );
};

exports.getMyRedemptions = (req, res) => {
    const authUserId = req.authUser?.id;
    const authUserRole = req.authUser?.role;
    if (!authUserId) {
        return res.status(401).json({ message: 'Sesi login tidak valid' });
    }

    if (authUserRole !== 'nasabah') {
        return res.status(403).json({ message: 'Hanya nasabah yang dapat melihat penukaran pribadi' });
    }

    db.query(
        `
        SELECT rr.*, r.nama_reward, u.nama AS nama_user, u.email AS email_user, admin.nama AS processed_by_name
        FROM reward_redemptions rr
        JOIN rewards r ON r.id_reward = rr.id_reward
        JOIN user u ON u.id_user = rr.id_user
        LEFT JOIN user admin ON admin.id_user = rr.processed_by
        WHERE rr.id_user = ?
        ORDER BY rr.requested_at DESC, rr.id_redemption DESC
        `,
        [authUserId],
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.json(result.map(mapRedemptionRow));
        }
    );
};

exports.getAdminRedemptions = (_req, res) => {
    db.query(
        `
        SELECT rr.*, r.nama_reward, u.nama AS nama_user, u.email AS email_user, admin.nama AS processed_by_name
        FROM reward_redemptions rr
        JOIN rewards r ON r.id_reward = rr.id_reward
        JOIN user u ON u.id_user = rr.id_user
        LEFT JOIN user admin ON admin.id_user = rr.processed_by
        ORDER BY rr.requested_at DESC, rr.id_redemption DESC
        `,
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.json(result.map(mapRedemptionRow));
        }
    );
};

exports.updateRedemptionStatus = (req, res) => {
    const authUserId = req.authUser?.id;
    const { id } = req.params;
    const status = String(req.body.status || '').trim();

    if (!['approved', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({
            message: 'Status penukaran hanya boleh approved, rejected, atau completed'
        });
    }

    db.query(
        `
        SELECT rr.*, r.stok
        FROM reward_redemptions rr
        JOIN rewards r ON r.id_reward = rr.id_reward
        WHERE rr.id_redemption = ?
        LIMIT 1
        `,
        [id],
        (fetchErr, rows) => {
            if (fetchErr) return res.status(500).json(fetchErr);
            if (!rows || rows.length === 0) {
                return res.status(404).json({ message: 'Permintaan penukaran tidak ditemukan' });
            }

            const redemption = rows[0];

            if (status === 'approved' && redemption.status !== 'pending') {
                return res.status(400).json({ message: 'Hanya penukaran pending yang bisa disetujui' });
            }

            if (status === 'rejected' && !['pending', 'approved'].includes(redemption.status)) {
                return res.status(400).json({ message: 'Status ini tidak bisa ditolak lagi' });
            }

            if (status === 'completed' && redemption.status !== 'approved') {
                return res.status(400).json({ message: 'Hanya penukaran approved yang bisa diselesaikan' });
            }

            const finalizeUpdate = () => {
                db.query(
                    `
                    UPDATE reward_redemptions
                    SET status = ?, processed_at = NOW(), processed_by = ?
                    WHERE id_redemption = ?
                    `,
                    [status, authUserId || null, id],
                    (updateErr) => {
                        if (updateErr) return res.status(500).json(updateErr);
                        emitNotification({
                            userId: String(redemption.id_user),
                            title: 'Status penukaran diperbarui',
                            message:
                                status === 'approved'
                                    ? 'Permintaan penukaran Anda sudah disetujui admin.'
                                    : status === 'completed'
                                    ? 'Penukaran hadiah Anda sudah selesai diproses.'
                                    : 'Permintaan penukaran Anda ditolak admin.',
                            entity: 'redemption',
                            payload: {
                                redemptionId: Number(id),
                                status
                            }
                        });
                        emitNotification({
                            role: 'admin',
                            title: 'Penukaran hadiah diproses',
                            message: `Penukaran hadiah #${id} berhasil diperbarui menjadi ${status}.`,
                            entity: 'redemption',
                            payload: {
                                redemptionId: Number(id),
                                status
                            }
                        });
                        return res.json({ message: 'Status penukaran berhasil diperbarui' });
                    }
                );
            };

            if (status === 'approved') {
                if (Number(redemption.stok || 0) < Number(redemption.quantity || 0)) {
                    return res.status(400).json({ message: 'Stok barang tidak mencukupi untuk disetujui' });
                }

                db.query(
                    'UPDATE rewards SET stok = stok - ? WHERE id_reward = ? AND stok >= ?',
                    [redemption.quantity, redemption.id_reward, redemption.quantity],
                    (stockErr, stockResult) => {
                        if (stockErr) return res.status(500).json(stockErr);
                        if (stockResult.affectedRows === 0) {
                            return res.status(400).json({ message: 'Stok barang tidak mencukupi untuk disetujui' });
                        }
                        finalizeUpdate();
                    }
                );
                return;
            }

            if (status === 'rejected' && redemption.status === 'approved') {
                db.query(
                    'UPDATE rewards SET stok = stok + ? WHERE id_reward = ?',
                    [redemption.quantity, redemption.id_reward],
                    (stockErr) => {
                        if (stockErr) return res.status(500).json(stockErr);
                        finalizeUpdate();
                    }
                );
                return;
            }

            finalizeUpdate();
        }
    );
};
