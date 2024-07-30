import express from 'express';
import * as userController from '../controllers/userController.js';
import { checkAuth, checkRole } from '../controllers/authController.js';

const router = express.Router();

router.post('/', checkAuth, checkRole, userController.createUser);
router.get('/', checkAuth, checkRole, userController.readUsers);
router.get('/:username', checkAuth, checkRole, userController.readUser);
router.put('/', checkAuth, checkRole, userController.updateUser);
router.delete('/:username', checkAuth, checkRole, userController.deleteUser);

export default router;
