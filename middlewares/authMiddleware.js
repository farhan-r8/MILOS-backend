const { verifyToken } = require('../utils/token');

const readBearerToken = (req) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice('Bearer '.length).trim();
};

const authenticateUser = (req, res, next) => {
    const token = readBearerToken(req);
    if (!token) {
        return res.status(401).json({
            message: 'Token tidak ditemukan. Gunakan Authorization: Bearer <token>'
        });
    }

    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({
            message: 'Token tidak valid atau sudah kedaluwarsa'
        });
    }

    req.authUser = {
        id: payload.userId,
        email: payload.email,
        role: payload.role
    };

    return next();
};

const requireAdmin = (req, res, next) => {
    if (!req.authUser || req.authUser.role !== 'admin') {
        return res.status(403).json({
            message: 'Akses ditolak. Endpoint ini hanya untuk Admin/Pengurus'
        });
    }
    return next();
};

module.exports = {
    authenticateUser,
    requireAdmin
};
