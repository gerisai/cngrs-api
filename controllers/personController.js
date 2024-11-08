import Person from '../models/person.js';
import logger from '../util/logging.js';
import auditAction from '../util/audit.js';
import { sendMail } from '../util/mailer.js';
import { createUploadQr, deleteQr } from '../util/qr.js';
import { s3BucketUrl } from '../util/constants.js';
import { createPersonId, normalizeName, sleep } from '../util/utilities.js';

const resource = 'PERSON';

export async function createPerson (req,res) {
    const action = 'CREATE';
    
    const personId = createPersonId(req.body.name);

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

        peopleList.map(async u => {
            const personId = createPersonId(u.name);
            u['personId'] = personId;
            if (process.env.ENABLE_QR === "true") {
                await createUploadQr('person', personId);
                u['qrurl'] = `${s3BucketUrl}/person/${personId}/${personId}.jpeg`;
            }
        });
    
        const people = await Person.insertMany(userList);
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
        logger.error(err);
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
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}

export async function readPeople (req, res) {
    try {
        const people = await Person.find().select({
            personId: 1,
            name: 1,
            email: 1,
            zone: 1,
            branch: 1,
            accessed: 1
        });

        logger.info(`Read all people successfully`);

        return res.status(200).send({
            people,
            message: `Users fetched successfully`
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

    const { personId } = req.params;
    
    try {
        const person = await Person.findOneAndDelete({ personId });
        if (!person) return res.status(404).send({ message: 'Unexistent person' });
        
        logger.warn(`Deleted ${person.name} successfully`);
        auditAction(req.user.username, action, resource, person.personId);
        
        await deleteQr(personId);

        return res.status(200).send({ message: `Person ${person.name} deleted successfully` });
    } catch (err) {
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}
