import Person from '../models/person.js';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, unlink } from 'fs';
import QRCode from 'qrcode';
import { promisify } from 'util';
import debug from 'debug'

// Set up debug
const debugperson = debug('api:controllers');

function createPersonId(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\ /g,'')
}

export async function createPerson (req,res) {
    const toFile = promisify(QRCode.toFile);
    const unLink = promisify(unlink);
    const personId = createPersonId(req.body.name);

    try {
        const fileName = `${personId}.svg`

        await toFile(fileName,personId);
        debugperson(`Created SVG image for ${fileName}`);

        const stream = createReadStream(fileName)

        const client = new S3Client({});
        const command = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: stream,
            ContentType: 'image/svg+xml'
        });

        await client.send(command);

        debugperson(`Uploaded ${fileName} to ${process.env.S3_BUCKET_NAME} S3 bucket`);

        const newPerson = await Person.create({
            personId: personId,
            name: req.body.name,
            registered: req.body.registered || false,
            room: req.body.room || null,
            qrurl: `https://${process.env.S3_BUCKET_URI}/${fileName}`
        });

        debugperson(`Created person ${personId} in DB with ID: ${newPerson.id}`);

        await unLink(fileName);

        debugperson(`Removed ${fileName} successfully`)

        return res.status(200).send({
            name: newPerson.name,
            message: `Person ${newPerson.personId} created successfully`
        });
    } catch (err) {
        if (err.code === 11000) err.message = `Name ${req.body.name} already exist`;
        return res.status(400).send({ message: err.message });
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
        debugperson(`Updated person ${personUpdated.name}`);
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
        
        debugperson(`Deleted ${person.name} successfully`);

        const client = new S3Client({});
        const command = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `${person.personId}.svg`
        });

        await client.send(command);

        debugperson(`Deleted ${person.personId}.svg successfully from ${process.env.S3_BUCKET_NAME} S3 bucket`);

        return res.status(200).send({ message: `User ${person.name} deleted successfully` });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: err.message });
    }
}
