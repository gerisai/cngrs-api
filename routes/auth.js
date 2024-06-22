import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.get('/status', authController.checkAuth);

export default router;
