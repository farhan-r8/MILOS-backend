const express = require('express');
const router = express.Router();

const jadwalController = require('../controllers/jadwalController');
const { authenticateUser, requireAdmin } = require('../middlewares/authMiddleware');

router.get('/jadwal', jadwalController.getJadwal);
router.post('/jadwal', authenticateUser, requireAdmin, jadwalController.createJadwal);
router.put('/jadwal/:id', authenticateUser, requireAdmin, jadwalController.updateJadwal);
router.delete('/jadwal/:id', authenticateUser, requireAdmin, jadwalController.deleteJadwal);

module.exports = router;
