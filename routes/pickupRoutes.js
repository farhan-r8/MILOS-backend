const express = require('express');
const router = express.Router();

const pickupController = require('../controllers/pickupController');
const { authenticateUser, requireAdmin } = require('../middlewares/authMiddleware');

router.post('/pickup', authenticateUser, pickupController.createPickup);
router.get('/pickup', authenticateUser, pickupController.getPickup);
router.patch('/pickup/:id/status', authenticateUser, requireAdmin, pickupController.updatePickupStatus);

module.exports = router;
