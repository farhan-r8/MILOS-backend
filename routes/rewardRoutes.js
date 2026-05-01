const express = require('express');
const router = express.Router();

const rewardController = require('../controllers/rewardController');
const { authenticateUser, requireAdmin } = require('../middlewares/authMiddleware');

router.get('/rewards', rewardController.getRewards);
router.get('/admin/rewards', authenticateUser, requireAdmin, rewardController.getAdminRewards);
router.post('/admin/rewards', authenticateUser, requireAdmin, rewardController.createReward);
router.put('/admin/rewards/:id', authenticateUser, requireAdmin, rewardController.updateReward);
router.delete('/admin/rewards/:id', authenticateUser, requireAdmin, rewardController.deleteReward);

router.post('/rewards/:id/redeem', authenticateUser, rewardController.createRedemption);
router.get('/redemptions/me', authenticateUser, rewardController.getMyRedemptions);
router.get('/admin/redemptions', authenticateUser, requireAdmin, rewardController.getAdminRedemptions);
router.patch('/admin/redemptions/:id/status', authenticateUser, requireAdmin, rewardController.updateRedemptionStatus);

module.exports = router;
