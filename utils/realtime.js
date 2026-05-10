const { Server } = require('socket.io');
const { verifyToken } = require('./token');

let ioInstance = null;

const normalizeOrigins = (origins) => {
    if (!origins) return [];
    if (origins instanceof Set) return Array.from(origins);
    if (Array.isArray(origins)) return origins;
    return [origins];
};

const initRealtime = (server, origins) => {
    ioInstance = new Server(server, {
        cors: {
            origin: normalizeOrigins(origins),
            credentials: true
        }
    });

    ioInstance.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        const payload = verifyToken(token);

        if (!payload) {
            return next(new Error('Unauthorized'));
        }

        socket.user = payload;
        return next();
    });

    ioInstance.on('connection', (socket) => {
        const userId = String(socket.user?.id || '');
        const role = String(socket.user?.role || '');

        if (userId) {
            socket.join(`user:${userId}`);
        }

        if (role) {
            socket.join(`role:${role}`);
        }
    });

    return ioInstance;
};

const emitNotification = ({ userId, role, title, message, type = 'info', entity = 'general', payload = null }) => {
    if (!ioInstance) return;

    const notification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title,
        message,
        type,
        entity,
        payload,
        createdAt: new Date().toISOString()
    };

    if (userId) {
        ioInstance.to(`user:${String(userId)}`).emit('notification', notification);
    }

    if (role) {
        ioInstance.to(`role:${String(role)}`).emit('notification', notification);
    }
};

module.exports = {
    initRealtime,
    emitNotification
};
