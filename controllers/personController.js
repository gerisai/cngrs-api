import { v4 as uuidv4 } from 'uuid';
import Person from '../models/person.js';
import logger from '../util/logging.js';
import auditAction from '../util/audit.js';
import { parseCsv } from '../util/csv.js';
import { sendMailMessage } from '../util/sqs.js';
import { createPersonId, normalizeName, sanitize } from '../util/utilities.js';

const resource = 'person';

export async function createPerson (req,res) {
    const action = 'CREATE';
    const mandatory = ['name','email','gender', 'cellphone']
    for (const p in req.body) { // delete empty values
        if (!req.body[p]) delete req.body[p]
    }

    if (mandatory.filter(v => !Object.keys(req.body).includes(v)).length !== 0) {
        return res.status(400).send({ message: `The ${mandatory.join(', ')} fields are mandatory` });
    }

    const personId = createPersonId(req.body.name);
    sanitize(req.body);

    try {
        // Document generation
        const newPerson = await Person.create({
            personId: personId,
            name: normalizeName(req.body.name),
            email: req.body.email,
            accessed: req.body.accessed || false,
            gender: req.body.gender,
            cellphone: req.body.cellphone,
            city: req.body.city || null,
            illness: req.body.illness || null,
            tutor: req.body.tutor || null,
            zone: req.body.zone || null,
            branch: req.body.branch || null,
            room: req.body.room || null
        });

        logger.info(`Created ${resource} ${personId} in DB with ID: ${newPerson.id}`);
        auditAction(req.user.username, action, resource, newPerson.personId);
        
        // Send mail message
        await sendMailMessage(resource, newPerson);
        logger.info(`Queued email for ${newPerson.name}`);

        return res.status(200).send({
            name: newPerson.name,
            message: `Person ${newPerson.personId} created successfully`
        });
    } catch (err) {
        if (err.code === 11000) err.message = `Name ${req.body.name} already exist`;
        return res.status(500).send({ message: err.message });
    }
}

export async function bulkCreatePerson (req,res) {
    const action = 'UPDATE BULK';
    try {
        const { tempFilePath: filePath, mimetype: fileType } = req.files.csv;
        const extension = fileType.split('/')[1];
        if (!extension === 'csv') throw new Error('Only CSV files are supported');
        const peopleList = await parseCsv(filePath, resource);

        peopleList.map(u => {
            const personId = createPersonId(u.name);
            u['name'] = normalizeName(u.name);
            u['personId'] = personId;
        });
    
        const people = await Person.insertMany(peopleList);
        logger.info(`Created ${people.length} asistants in DB from list successfully`);

        const groupId = uuidv4(); // Single groupId to avoid multiple instances of lambda from trigerring, respecting SES quotas
        for (const p of people) {
            sendMailMessage(resource, p, groupId);
        }
        
        auditAction(req.user.username, action, resource);
        return res.status(200).send({ message: `${people.length} asistants were created successfully` });
    } catch (err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function readPerson (req,res) {
    const { personId } = req.params;
    try {
        const person = await Person.findOne({ personId });
        if (!person) {
            logger.verbose(`Failed lookup for ${personId}, does not exsit`);
            return res.status(404).send({ message: `The ${resource} ${personId} does not exist` });
        }
        logger.verbose(`Successful lookup for ${personId}`);
        return res.status(200).send({
            person: {
                personId: person.personId,
                name: person.name,
                email: person.email,
                gender: person.gender,
                cellphone: person.cellphone,
                zone: person.zone,
                branch: person.branch,
                illness: person.illness,
                tutor: person.tutor,
                room: person.room,
                accessed: person.accessed,
                city: person.city
            },
            message: `Fetched ${person.name}` 
        });
    } catch(err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function getPersonCategory (req,res) {
    const valid = ['room', 'zone', 'branch', 'city', 'accessed'];
    const { name } = req.query;
    if (!req.query|| !valid.includes(name)) return res.status(400).send({ message: `Invalid or empty category: ${name}` });
    
    try {
        const category = await Person.distinct(name);
        logger.debug(`Fetched ${name} category`);
        return res.status(200).send({ category });
    } catch(err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function readPeople (req, res) {
    const accessed = {
        "true": true,
        "false": false
    }
    const valid = ['name', 'accessed', 'gender', 'zone', 'branch', 'room', 'city'];
    const query = {};
    for (const p in req.query) {
        if (req.query[p] && valid.includes(p)) {
            if (Array.isArray(req.query[p])) {
                query[p] = req.query[p].map((e) => accessed[e] !== undefined ? accessed[e] : new RegExp(e, 'i'))
            } else {
                query[p] = new RegExp(req.query[p], 'i');
            }
        }
    }

    const { limit = 25, page = 1 } = req.query
    const skip = limit * (page - 1) > 0 ? limit*(page - 1) : 0;
    try {
        const people = await Person.find(query)
        .sort({
            name: 1
        })
        .select({
            personId: 1,
            name: 1,
            zone: 1,
            branch: 1,
            accessed: 1,
            city: 1,
            room: 1
        })
        .limit(limit).skip(skip);

        logger.info(`Read ${people.length} people successfully`);

        return res.status(200).send({
            people,
            message: `People fetched successfully`
        });
    } catch(err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function readPeopleNames (req, res) {
    try {
        const peopleNames = await Person.find({})
        .sort({
            name: 1
        })
        .select({
            _id: 0,
            name: 1
        })

        logger.info(`Read all people names successfully`);

        return res.status(200).send({
            peopleNames,
            message: `People names fetched successfully`
        });
    } catch(err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function updatePerson (req,res) {
    const action = 'UPDATE';

    const { personId } = req.body;
    try {
        const person = await Person.findOne({ personId });
        if (!person) return res.status(404).send({ message: `The ${resource} ${personId} does not exist` });
        if (req.body.name) req.body.name = normalizeName(req.body.name);
        delete req.body.personId // personId cannot be changed
        Object.assign(person,req.body); // assign updated properties
        for (const p in req.body) { // delete empty values
            if (!req.body[p]) delete req.body[p]
        }
        const personUpdated = await person.save(); // No password but keeping consistency
        logger.info(`Updated ${resource} ${personUpdated.name}`);
        auditAction(req.user.username, action, resource, personUpdated.personId);
        
        return res.status(200).send({
            message: `${personUpdated.name} updated` 
        });
    } catch(err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function deletePerson (req,res) {
    const action = 'DELETE';

    const { personId } = req.params;
    
    try {
        const person = await Person.findOneAndDelete({ personId });
        if (!person) return res.status(404).send({ message: `Unexistent ${resource}` });
        
        logger.warn(`Deleted ${person.name} successfully`);
        auditAction(req.user.username, action, resource, person.personId);

        return res.status(200).send({ message: `Person ${person.name} deleted successfully` });
    } catch (err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function getStats (req,res) {
    const valid = ['accessed'];
    const query = {};
    for (const p in req.query) {
        if (req.query[p] && valid.includes(p)) query[p] = true; 
    }
    try {
        const count = await Person.countDocuments(query);

        logger.info(`Checked statistics for ${count} people successfully`);

        return res.status(200).send({
            count,
            message: `People fetched successfully`
        });
    } catch(err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}
