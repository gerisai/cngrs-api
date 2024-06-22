import express from 'express';
import * as userController from '../controllers/userController.js';

const router = express.Router();

router.post('/', userController.createUser);
router.put('/', userController.updateUser);
router.delete('/:username', userController.deleteUser);

export default router;
