import Person from '../models/person.js';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, unlink } from 'fs';
import QRCode from 'qrcode';
import { promisify } from 'util';
import logger from '../util/logging.js';

function createPersonId(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\ /g,'');
}

export async function createPerson (req,res) {
    const toFile = promisify(QRCode.toFile);
    const unLink = promisify(unlink);
    const personId = createPersonId(req.body.name);

    try {
        const fileName = `${personId}.svg`

        await toFile(fileName,personId);
        logger.debug(`Created SVG image for ${fileName} locally`);

        const stream = createReadStream(fileName)

        const client = new S3Client({});
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: stream,
            ContentType: 'image/svg+xml'
        });

        await client.send(command);

        logger.verbose(`Uploaded ${fileName} to ${process.env.S3_BUCKET_NAME} S3 bucket`);

        const newPerson = await Person.create({
            personId: personId,
            name: req.body.name,
            registered: req.body.registered || false,
            room: req.body.room || null,
            qrurl: `https://${process.env.S3_BUCKET_URI}/${fileName}`
        });

        logger.verbose(`Created person ${personId} in DB with ID: ${newPerson.id}`);

        await unLink(fileName);

        logger.debug(`Removed local ${fileName} successfully`)

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
        if (!person) return res.status(404).send({ message: `The person ${personId} does not exist` });
        return res.status(200).send({
            person: {
                personId: person.personId,
                name: person.name,
                registered: person.registered,
                qrurl: person.qrurl,
                room: person.room
            },
            message: `Fetched ${person.name}` 
        });
    } catch(err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}

export async function updatePerson (req,res) {
    const { name } = req.body;
    try {
        const person = await Person.findOne({ name });
        if (!person) return res.status(404).send({ message: `The person ${name} does not exist` });
        delete req.body.name; // username cannot be overwritten
        delete req.body.personId // personId cannot be changed
        Object.assign(person,req.body); // assign updated properties
        const personUpdated = await person.save(); // No password but keeping consistency
        logger.verbose(`Updated person ${personUpdated.name}`);
        return res.status(200).send({ 
            ...personUpdated,
            message: `Person ${personUpdated.name} updated` 
        });
    } catch(err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}

export async function deletePerson (req,res) {
    try {
        const person = await Person.findOneAndDelete({ personId: req.params.personId });
        if (!person) return res.status(404).send({ message: 'Unexistent person' });
        
        logger.verbose(`Deleted ${person.name} successfully`);

        const client = new S3Client({});
        const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `${person.personId}.svg`
        });

        await client.send(command);

        logger.verbose(`Deleted ${person.personId}.svg successfully from ${process.env.S3_BUCKET_NAME} S3 bucket`);

        return res.status(200).send({ message: `User ${person.name} deleted successfully` });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}
