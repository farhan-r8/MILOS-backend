const express = require('express');
const router = express.Router();

const transaksiController = require('../controllers/transaksiController');
const { authenticateUser, requireAdmin } = require('../middlewares/authMiddleware');

// endpoint
router.post('/transaksi', authenticateUser, transaksiController.createTransaksi);
router.post('/detail', authenticateUser, transaksiController.tambahDetail);
router.get('/transaksi', transaksiController.getTransaksi);
router.get('/waste-types', transaksiController.getWasteTypes);
router.patch('/transaksi/:id/verify', authenticateUser, requireAdmin, transaksiController.verifyTransaksi);
router.get('/laporan/summary', authenticateUser, requireAdmin, transaksiController.getLaporanSummary);


module.exports = router;
