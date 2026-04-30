const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { authenticateUser, requireAdmin } = require('../middlewares/authMiddleware');

router.get('/users', authenticateUser, requireAdmin, userController.getUsers);
router.post('/users', authenticateUser, requireAdmin, userController.createUser);
router.post('/auth/login', userController.loginUser);
router.post('/auth/register', userController.registerNasabah);
router.post('/auth/google/login', userController.loginGoogleUser);
router.post('/auth/admin/login', userController.loginAdmin);
router.post('/auth/admin/logout', authenticateUser, requireAdmin, userController.logoutAdmin);
router.put('/admin/nasabah/:id', authenticateUser, requireAdmin, userController.updateNasabah);
router.delete('/admin/nasabah/:id', authenticateUser, requireAdmin, userController.deleteNasabah);
router.get('/users/:id_user/points', userController.getPoinUser);
router.get('/users/points/total', userController.getTotalPoin);

module.exports = router;
