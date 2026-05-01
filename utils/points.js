const db = require('../config/db');

const getEarnedVerifiedPoints = (userId) => new Promise((resolve, reject) => {
    db.query(
        `
        SELECT COALESCE(SUM(d.poin), 0) AS earned_points
        FROM transaksi t
        LEFT JOIN detail_transaksi d ON d.id_transaksi = t.id_transaksi
        WHERE t.id_user = ? AND t.status = 'verified'
        `,
        [userId],
        (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(Number(result?.[0]?.earned_points || 0));
        }
    );
});

const getReservedRedemptionPoints = (userId) => new Promise((resolve, reject) => {
    db.query(
        `
        SELECT COALESCE(SUM(total_poin), 0) AS reserved_points
        FROM reward_redemptions
        WHERE id_user = ? AND status IN ('pending', 'approved', 'completed')
        `,
        [userId],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_NO_SUCH_TABLE') {
                    resolve(0);
                    return;
                }
                reject(err);
                return;
            }

            resolve(Number(result?.[0]?.reserved_points || 0));
        }
    );
});

const getAvailablePointsForUser = async (userId) => {
    const [earnedPoints, reservedPoints] = await Promise.all([
        getEarnedVerifiedPoints(userId),
        getReservedRedemptionPoints(userId)
    ]);

    return {
        earnedPoints,
        reservedPoints,
        availablePoints: Math.max(0, earnedPoints - reservedPoints)
    };
};

module.exports = {
    getEarnedVerifiedPoints,
    getReservedRedemptionPoints,
    getAvailablePointsForUser
};
