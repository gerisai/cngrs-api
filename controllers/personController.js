import Person from '../models/person.js';
import logger from '../util/logging.js';
import auditAction from '../util/audit.js';

const resource = 'PERSON';

function createPersonId(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\ /g,'');
}

export async function createPerson (req,res) {
    const action = 'CREATE';
    
    const personId = createPersonId(req.body.name);

    try {

        const newPerson = await Person.create({
            personId: personId,
            name: req.body.name,
            registered: req.body.registered || false,
            room: req.body.room || null
        });

        logger.info(`Created person ${personId} in DB with ID: ${newPerson.id}`);
        auditAction(req.user.username, action, resource, newPerson.personId);

        return res.status(200).send({
            name: newPerson.name,
            message: `Person ${newPerson.personId} created successfully`
        });
    } catch (err) {
        if (err.code === 11000) err.message = `Name ${req.body.name} already exist`;
        return res.status(400).send({ message: err.message });
    }
}

export async function readPerson (req,res) {
    const { personId } = req.params;
    try {
        const person = await Person.findOne({ personId });
        if (!person) {
            logger.verbose(`Failed lookup for ${personId}, does not exsit`);
            return res.status(404).send({ message: `The person ${personId} does not exist` });
        }
        logger.verbose(`Successful lookup for ${personId}`);
        return res.status(200).send({
            person: {
                personId: person.personId,
                name: person.name,
                registered: person.registered,
                room: person.room
            },
            message: `Fetched ${person.name}` 
        });
    } catch(err) {
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}

export async function updatePerson (req,res) {
    const action = 'UPDATE';

    const { personId } = req.body;
    try {
        const person = await Person.findOne({ personId });
        if (!person) return res.status(404).send({ message: `The person ${personId} does not exist` });
        delete req.body.name; // username cannot be overwritten
        delete req.body.personId // personId cannot be changed
        Object.assign(person,req.body); // assign updated properties
        const personUpdated = await person.save(); // No password but keeping consistency
        logger.info(`Updated person ${personUpdated.name}`);
        auditAction(req.user.username, action, resource, personUpdated.personId);
        
        return res.status(200).send({
            message: `Person ${personUpdated.name} updated` 
        });
    } catch(err) {
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}

export async function deletePerson (req,res) {
    const action = 'DELETE';
    
    try {
        const person = await Person.findOneAndDelete({ personId: req.params.personId });
        if (!person) return res.status(404).send({ message: 'Unexistent person' });
        
        logger.warn(`Deleted ${person.name} successfully`);
        auditAction(req.user.username, action, resource, person.personId);
        
        return res.status(200).send({ message: `User ${person.name} deleted successfully` });
    } catch (err) {
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}
