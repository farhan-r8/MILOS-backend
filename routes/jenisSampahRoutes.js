const express = require('express');
const router = express.Router();

const jenisSampahController = require('../controllers/jenisSampahController');
const { authenticateUser, requireAdmin } = require('../middlewares/authMiddleware');

router.get('/jenis-sampah', authenticateUser, requireAdmin, jenisSampahController.getAllJenisSampah);
router.get('/jenis-sampah/:id', authenticateUser, requireAdmin, jenisSampahController.getJenisSampahById);
router.post('/jenis-sampah', authenticateUser, requireAdmin, jenisSampahController.createJenisSampah);
router.put('/jenis-sampah/:id', authenticateUser, requireAdmin, jenisSampahController.updateJenisSampah);
router.delete('/jenis-sampah/:id', authenticateUser, requireAdmin, jenisSampahController.deleteJenisSampah);

module.exports = router;
