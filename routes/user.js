import express from 'express';
import multer from 'multer';
import * as userController from '../controllers/userController.js';
import { checkAuth, checkRole } from '../controllers/authController.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination(req, file, callback) {
      callback(null, process.env.UPLOAD_TEMP_FILE_DIR);
    },
    filename(req, file, callback) {
      callback(null, `${file.fieldname}_${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({
    storage: storage,
    limits: {
        files: 1,
        fileSize: 5 * 1024 * 1024,
    }
});

router.post('/', checkAuth, checkRole, userController.createUser);
router.post('/bulkcreate', checkAuth, checkRole, userController.bulkCreateUser);
router.post('/:username', checkAuth, checkRole, upload.single('avatar'), userController.uploadAvatar);
router.get('/', checkAuth, checkRole, userController.readUsers);
router.get('/:username', checkAuth, checkRole, userController.readUser);
router.put('/', checkAuth, checkRole, userController.updateUser);
router.delete('/:username', checkAuth, checkRole, userController.deleteUser);

export default router;
