import express from 'express';
import * as personController from '../controllers/personController.js';
import { checkAuth, checkRole } from '../controllers/authController.js';

const router = express.Router();

router.post('/', checkAuth, checkRole, personController.createPerson);
router.get('/:personId', checkAuth, checkRole, personController.readPerson);
router.put('/', checkAuth, checkRole, personController.updatePerson);
router.delete('/:personId', checkAuth, checkRole, personController.deletePerson);

export default router;
