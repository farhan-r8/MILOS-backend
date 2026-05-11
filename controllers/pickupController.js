const db = require('../config/db');
const { emitNotification } = require('../utils/realtime');

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

const pickupDayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'long' });
const normalizeDayName = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    const mapping = {
        minggu: 'minggu',
        senin: 'senin',
        selasa: 'selasa',
        rabu: 'rabu',
        kamis: 'kamis',
        jumat: 'jumat',
        "jum'at": 'jumat',
        sabtu: 'sabtu'
    };

    return mapping[normalized] || normalized;
};

const promiseDb = db.promise();

exports.createPickup = async (req, res) => {
    const authUserId = req.authUser?.id;
    const id_user = req.body.id_user || req.body.userId || authUserId;
    const id_jadwal = req.body.id_jadwal || req.body.scheduleId || null;
    const alamat = req.body.alamat || req.body.address || null;

    const pickupDate = req.body.pickupDate;

    if (!id_user) {
        return res.status(400).json({ message: 'Field wajib: id_user/userId' });
    }

    if (!id_jadwal) {
        return res.status(400).json({ message: 'Jadwal admin harus dipilih' });
    }

    if (!alamat) {
        return res.status(400).json({ message: 'Alamat pickup harus diisi' });
    }

    if (!pickupDate) {
        return res.status(400).json({ message: 'Tanggal pickup harus dipilih' });
    }

    const estimatedWeight = Number(req.body.estimatedWeight || 0);
    if (estimatedWeight < 2) {
        return res.status(400).json({ message: 'Minimum berat pickup adalah 2 kg' });
    }

    const pickupDay = normalizeDayName(pickupDayFormatter.format(new Date(pickupDate)));
    if (pickupDay === 'minggu') {
        return res.status(400).json({ message: 'Hari Minggu tidak melayani pickup' });
    }

    try {
        const [scheduleRows] = await promiseDb.query(
            'SELECT id_jadwal, wilayah, hari, jam, is_aktif FROM jadwal WHERE id_jadwal = ? LIMIT 1',
            [id_jadwal]
        );

        if (!scheduleRows || scheduleRows.length === 0) {
            return res.status(404).json({ message: 'Jadwal pickup tidak ditemukan' });
        }

        const schedule = scheduleRows[0];
        if (Number(schedule.is_aktif) !== 1) {
            return res.status(400).json({ message: 'Jadwal pickup sedang tidak aktif' });
        }

        if (normalizeDayName(schedule.hari) !== pickupDay) {
            return res.status(400).json({ message: 'Tanggal pickup harus sesuai dengan hari jadwal yang dipilih' });
        }

        const [sameDayRows] = await promiseDb.query(
            `
            SELECT catatan, status
            FROM pengajuan_pickup
            WHERE status <> 'rejected'
            `
        );

        const sameDayCount = (sameDayRows || []).filter((row) => {
            const extra = parsePickupNotes(row.catatan);
            return extra.pickupDate === pickupDate;
        }).length;

        if (sameDayCount >= 10) {
            return res.status(400).json({ message: 'Kuota pickup untuk tanggal tersebut sudah penuh (maksimal 10 pickup per hari)' });
        }
    } catch (validationError) {
        return res.status(500).json({
            message: validationError.message || 'Gagal memvalidasi pengajuan pickup'
        });
    }

    const catatan = buildPickupNotes(req.body.catatan || req.body.notes || null, {
        wasteType: req.body.wasteType,
        estimatedWeight: req.body.estimatedWeight,
        pickupDate,
        timeSlot: req.body.timeSlot
    });

    db.query(
        `INSERT INTO pengajuan_pickup (id_user, id_jadwal, alamat, catatan, status, requested_at)
         VALUES (?, ?, ?, ?, 'pending', NOW())`,
        [id_user, id_jadwal, alamat, catatan],
        (err, result) => {
            if (err) return res.status(500).json(err);
            emitNotification({
                role: 'admin',
                title: 'Pickup baru masuk',
                message: `Ada permintaan pickup baru untuk tanggal ${pickupDate}.`,
                entity: 'pickup',
                payload: {
                    pickupId: result.insertId,
                    userId: String(id_user)
                }
            });

            if (req.io) {
                req.io.emit('milos:realtime', {
                    title: 'Pickup Baru',
                    message: `Ada permintaan pickup baru untuk tanggal ${pickupDate}.`,
                    type: 'info'
                });
            }

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

            db.query(
                'SELECT id_user FROM pengajuan_pickup WHERE id_pickup = ? LIMIT 1',
                [id],
                (fetchErr, rows) => {
                    if (!fetchErr && rows && rows.length > 0) {
                        emitNotification({
                            userId: String(rows[0].id_user),
                            title: 'Status pickup diperbarui',
                            message:
                                status === 'scheduled'
                                    ? 'Permintaan pickup Anda telah dijadwalkan admin.'
                                    : status === 'approved'
                                    ? 'Permintaan pickup Anda telah disetujui admin.'
                                    : status === 'rejected'
                                    ? 'Permintaan pickup Anda ditolak admin.'
                                    : `Status pickup Anda berubah menjadi ${status}.`,
                            entity: 'pickup',
                            payload: {
                                pickupId: Number(id),
                                status
                            }
                        });
                    }

                    emitNotification({
                        role: 'admin',
                        title: 'Pickup diproses',
                        message: `Status pickup #${id} berubah menjadi ${status}.`,
                        entity: 'pickup',
                        payload: {
                            pickupId: Number(id),
                            status
                        }
                    });

                    if (req.io) {
                        req.io.emit('milos:realtime', {
                            title: status === 'rejected' ? 'Pickup Ditolak' : 'Pickup Berhasil',
                            message: `Permintaan pickup #${id} sekarang berstatus ${status}.`,
                            type: status === 'rejected' ? 'warning' : 'success'
                        });
                    }

                    return res.json({ message: 'Status pickup berhasil diupdate' });
                }
            );
        }
    );
};
