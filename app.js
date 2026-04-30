const express = require('express');
const cors = require('cors');

const app = express();

const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...extraOrigins]);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Origin tidak diizinkan oleh CORS'));
    },
    credentials: true
}));
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
