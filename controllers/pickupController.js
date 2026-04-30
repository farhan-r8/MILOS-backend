const db = require('../config/db');

const buildPickupNotes = (notes, extraData) => {
    const payload = {
        notes: notes || '',
        wasteType: extraData.wasteType || '',
        estimatedWeight: extraData.estimatedWeight || '',
        pickupDate: extraData.pickupDate || '',
        timeSlot: extraData.timeSlot || ''
    };

    return JSON.stringify(payload);
};

const parsePickupNotes = (rawValue) => {
    if (!rawValue) {
        return {
            notes: '',
            wasteType: '',
            estimatedWeight: '',
            pickupDate: '',
            timeSlot: ''
        };
    }

    try {
        const parsed = JSON.parse(rawValue);
        return {
            notes: parsed.notes || '',
            wasteType: parsed.wasteType || '',
            estimatedWeight: parsed.estimatedWeight || '',
            pickupDate: parsed.pickupDate || '',
            timeSlot: parsed.timeSlot || ''
        };
    } catch (_error) {
        return {
            notes: rawValue,
            wasteType: '',
            estimatedWeight: '',
            pickupDate: '',
            timeSlot: ''
        };
    }
};

const formatPickupRow = (row) => {
    const extra = parsePickupNotes(row.catatan);

    return {
        id: `PKP-${String(row.id_pickup).padStart(3, '0')}`,
        rawId: row.id_pickup,
        userId: String(row.id_user),
        customer: row.nama,
        phone: row.phone || null,
        address: row.alamat,
        scheduleId: row.id_jadwal ? String(row.id_jadwal) : null,
        area: row.wilayah || null,
        day: row.hari || null,
        time: extra.timeSlot || (row.jam ? String(row.jam).slice(0, 5) : null),
        wasteType: extra.wasteType || 'Tidak diketahui',
        estimatedWeight: extra.estimatedWeight ? Number(extra.estimatedWeight) : 0,
        date: extra.pickupDate || row.scheduled_at || row.requested_at,
        status: row.status,
        notes: extra.notes || '',
        requestedAt: row.requested_at,
        scheduledAt: row.scheduled_at
    };
};

exports.createPickup = (req, res) => {
    const authUserId = req.authUser?.id;
    const id_user = req.body.id_user || req.body.userId || authUserId;
    const id_jadwal = req.body.id_jadwal || req.body.scheduleId || null;
    const alamat = req.body.alamat || req.body.address || null;
    const catatan = buildPickupNotes(req.body.catatan || req.body.notes || null, {
        wasteType: req.body.wasteType,
        estimatedWeight: req.body.estimatedWeight,
        pickupDate: req.body.pickupDate,
        timeSlot: req.body.timeSlot
    });

    if (!id_user) {
        return res.status(400).json({ message: 'Field wajib: id_user/userId' });
    }

    db.query(
        `INSERT INTO pengajuan_pickup (id_user, id_jadwal, alamat, catatan, status, requested_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [id_user, id_jadwal, alamat, catatan],
        (err, result) => {
            if (err) return res.status(500).json(err);
            return res.status(201).json({
                message: 'Pengajuan pickup berhasil',
                id_pickup: result.insertId
            });
        }
    );
};

exports.getPickup = (req, res) => {
    const isAdmin = req.authUser?.role === 'admin';
    const requestedUserId = req.query.userId;
    const ownUserId = req.authUser?.id;

    let whereClause = '';
    let params = [];

    if (isAdmin && requestedUserId) {
        whereClause = 'WHERE p.id_user = ?';
        params = [requestedUserId];
    } else if (!isAdmin) {
        whereClause = 'WHERE p.id_user = ?';
        params = [ownUserId];
    }

    db.query(
        `SELECT p.id_pickup, p.id_user, u.nama, u.phone, p.id_jadwal, j.wilayah, j.hari, j.jam,
                p.alamat, p.catatan, p.status, p.requested_at, p.scheduled_at
         FROM pengajuan_pickup p
         JOIN user u ON u.id_user = p.id_user
         LEFT JOIN jadwal j ON j.id_jadwal = p.id_jadwal
         ${whereClause}
         ORDER BY p.id_pickup DESC`,
        params,
        (err, rows) => {
            if (err) return res.status(500).json(err);
            return res.json(rows.map(formatPickupRow));
        }
    );
};

exports.updatePickupStatus = (req, res) => {
    const { id } = req.params;
    const status = req.body.status;
    const id_jadwal = req.body.id_jadwal || req.body.scheduleId || null;
    const scheduled_at = req.body.scheduled_at || req.body.scheduledAt || null;

    const allowed = new Set(['approved', 'scheduled', 'rejected', 'done', 'pending']);
    if (!allowed.has(status)) {
        return res.status(400).json({ message: 'Status tidak valid' });
    }

    db.query(
        `UPDATE pengajuan_pickup
         SET status = ?, id_jadwal = COALESCE(?, id_jadwal), scheduled_at = COALESCE(?, scheduled_at), updated_at = CURRENT_TIMESTAMP
         WHERE id_pickup = ?`,
        [status, id_jadwal, scheduled_at, id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Pickup tidak ditemukan' });
            return res.json({ message: 'Status pickup berhasil diupdate' });
        }
    );
};
