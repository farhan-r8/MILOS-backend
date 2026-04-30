const express = require('express');
const cors = require('cors');

const app = express();

const normalizeOrigin = (origin) => String(origin || '').trim().replace(/\/$/, '');

const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
].map(normalizeOrigin);

const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...extraOrigins]);

const corsOptions = {
    origin: (origin, callback) => {
        const normalizedOrigin = normalizeOrigin(origin);
        if (!normalizedOrigin || allowedOrigins.has(normalizedOrigin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin tidak diizinkan oleh CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json()); 

app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'milos-backend'
    });
});

const userRoutes = require('./routes/userRoutes');
app.use('/api', userRoutes);
app.use('/', userRoutes);

const transaksiRoutes = require('./routes/transaksiRoutes');
app.use('/api', transaksiRoutes);
app.use('/', transaksiRoutes);

const jenisSampahRoutes = require('./routes/jenisSampahRoutes');
app.use('/api', jenisSampahRoutes);
app.use('/', jenisSampahRoutes);

const jadwalRoutes = require('./routes/jadwalRoutes');
app.use('/api', jadwalRoutes);
app.use('/', jadwalRoutes);

const pickupRoutes = require('./routes/pickupRoutes');
app.use('/api', pickupRoutes);
app.use('/', pickupRoutes);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = app;
