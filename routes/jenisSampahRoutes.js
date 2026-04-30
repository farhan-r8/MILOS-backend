const express = require('express');
const router = express.Router();

const jenisSampahController = require('../controllers/jenisSampahController');
const { authenticateUser, requireAdmin } = require('../middlewares/authMiddleware');

router.use(authenticateUser, requireAdmin);

router.get('/jenis-sampah', jenisSampahController.getAllJenisSampah);
router.get('/jenis-sampah/:id', jenisSampahController.getJenisSampahById);
router.post('/jenis-sampah', jenisSampahController.createJenisSampah);
router.put('/jenis-sampah/:id', jenisSampahController.updateJenisSampah);
router.delete('/jenis-sampah/:id', jenisSampahController.deleteJenisSampah);

module.exports = router;
