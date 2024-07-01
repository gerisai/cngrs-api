import express from 'express';
import * as personController from '../controllers/personController.js';

const router = express.Router();

router.post('/', personController.createPerson);
router.get('/:personId', personController.readPerson);
router.put('/', personController.updatePerson);
router.delete('/:personId', personController.deletePerson);

export default router;
