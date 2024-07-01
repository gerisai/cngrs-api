import express from 'express';
import * as personController from '../controllers/personController.js';

const router = express.Router();

router.post('/', personController.createPerson);
router.put('/', personController.updatePerson);
router.delete('/:personId', personController.deletePerson);

export default router;
