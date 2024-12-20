import express from 'express';
import * as personController from '../controllers/personController.js';
import { checkAuth, checkRole } from '../controllers/authController.js';

const router = express.Router();

router.post('/', checkAuth, checkRole, personController.createPerson);
router.put('/', checkAuth, checkRole, personController.updatePerson);
router.get('/', checkAuth, checkRole, personController.readPeople);
router.get('/allnames', checkAuth, checkRole, personController.readPeopleNames);
router.post('/bulkcreate', checkAuth, checkRole, personController.bulkCreatePerson);
router.get('/category', checkAuth, checkRole, personController.getPersonCategory);
router.get('/stats', checkAuth, checkRole, personController.getStats);
router.get('/stats/city', checkAuth, checkRole, personController.getCityStats);
router.get('/:personId', checkAuth, checkRole, personController.readPerson);
router.delete('/:personId', checkAuth, checkRole, personController.deletePerson);

export default router;
