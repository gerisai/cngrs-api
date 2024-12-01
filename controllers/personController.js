import Person from '../models/person.js';
import logger from '../util/logging.js';
import auditAction from '../util/audit.js';
import { sendMail } from '../util/mailer.js';
import { createUploadQr, deleteQr } from '../util/qr.js';
import { s3BucketUrl } from '../util/constants.js';
import { parseCsv } from '../util/csv.js';
import { createPersonId, normalizeName, sleep, sanitize } from '../util/utilities.js';

const resource = 'PERSON';

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
        // QR generation
        if (process.env.ENABLE_QR === "true") await createUploadQr('person', personId);

        // Document generation
        const newPerson = await Person.create({
            personId: personId,
            name: normalizeName(req.body.name),
            email: req.body.email,
            registered: req.body.registered || false,
            gender: req.body.gender,
            cellphone: req.body.cellphone,
            qrurl: `${s3BucketUrl}/person/${personId}/${personId}.jpeg`,
            illness: req.body.illness || null,
            tutor: req.body.tutor || null,
            zone: req.body.zone || null,
            branch: req.body.branch || null,
            room: req.body.room || null
        });

        logger.info(`Created person ${personId} in DB with ID: ${newPerson.id}`);
        auditAction(req.user.username, action, resource, newPerson.personId);
        
        if (process.env.ENABLE_PERSON_MAIL === "true") {
            sendMail('personOnboarding', newPerson.email, {
                name: newPerson.name,
                qrUrl: newPerson.qrurl
            });
            const personUpdated = await Person.findOneAndUpdate({ personId }, { sentMail: true })
            logger.info(`Updated person ${personUpdated.name}`);
        }

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
        const peopleList = await parseCsv(filePath, 'person');

        peopleList.map(u => {
            const personId = createPersonId(u.name);
            u['name'] = normalizeName(u.name);
            u['personId'] = personId;
            u['qrurl'] = `${s3BucketUrl}/person/${personId}/${personId}.jpeg`;
        });

        if (process.env.ENABLE_QR === "true") {
            for (const p of peopleList) { // DO NOT USE IT INSIDE MAP FUNCTION OR ERROR BREAK THE APP
                await createUploadQr('person', p.personId);
            }
        }
    
        const people = await Person.insertMany(peopleList);
        logger.info(`Created ${people.length} asistants in DB from list successfully`);

        if (req.query.sendMail === "true" && process.env.ENABLE_MAIL === "true") {
            for (const p of peopleList) {
                await sleep(100); // throtle to max 10 mails per second for SES quota (14/s)
                sendMail('personOnboarding', p.email, {
                    name: p.name,
                    qrUrl: p.qrurl
                });
                const personUpdated = await User.findOneAndUpdate({ personId: p.personId }, { sentMail: true })
                logger.info(`Person ${personUpdated.name} updated`);
            }
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
            return res.status(404).send({ message: `The person ${personId} does not exist` });
        }
        logger.verbose(`Successful lookup for ${personId}`);
        return res.status(200).send({
            person: {
                personId: person.personId,
                name: person.name,
                email: person.email,
                gender: person.gender,
                cellphone: person.cellphone,
                registered: person.registered,
                zone: person.zone,
                branch: person.branch,
                illness: person.illness,
                tutor: person.tutor,
                room: person.room,
                accessed: person.accessed
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
            email: 1,
            zone: 1,
            branch: 1,
            accessed: 1,
            gender: 1
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
        if (!person) return res.status(404).send({ message: `The person ${personId} does not exist` });
        if (req.body.name) req.body.name = normalizeName(req.body.name);
        delete req.body.personId // personId cannot be changed
        Object.assign(person,req.body); // assign updated properties
        for (const p in req.body) { // delete empty values
            if (!req.body[p]) delete req.body[p]
        }
        const personUpdated = await person.save(); // No password but keeping consistency
        logger.info(`Updated person ${personUpdated.name}`);
        auditAction(req.user.username, action, resource, personUpdated.personId);
        
        return res.status(200).send({
            message: `Person ${personUpdated.name} updated` 
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
        if (!person) return res.status(404).send({ message: 'Unexistent person' });
        
        logger.warn(`Deleted ${person.name} successfully`);
        auditAction(req.user.username, action, resource, person.personId);

        return res.status(200).send({ message: `Person ${person.name} deleted successfully` });
    } catch (err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    } finally {
        try {
            await deleteQr(personId);
        } catch(err) {
            logger.error(err.message);
        }
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
