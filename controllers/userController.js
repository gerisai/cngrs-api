import { unlink } from 'fs';
import { promisify } from 'util';
import User from '../models/user.js';
import Session from '../models/session.js';
import logger from '../util/logging.js';
import auditAction from '../util/audit.js';
import { sendMail } from '../util/mailer.js';
import { s3BucketUrl, s3UserKeyPrefix } from '../util/constants.js';
import { uploadObjectFromFile, deleteObject } from '../util/s3.js';
import { parseCsv } from '../util/csv.js';
import { sanitize, createUsername, createRandomPassword, sleep, normalizeName } from '../util/utilities.js';

const unLink = promisify(unlink);
let rmPath; // Needed due to variable scoping in uploadAvatar function

const resource = 'USER';

export async function createUser (req, res) {
    const action = 'CREATE';

    const mandatory = ['username','name','password', 'email', 'role']
    for (const p in req.body) { // delete empty values
        if (!req.body[p]) delete req.body[p]
    }

    if (mandatory.filter(v => !Object.keys(req.body).includes(v)).length !== 0) {
        return res.status(400).send({ message: `The ${mandatory.join(', ')} fields are mandatory` });
    }

    if (req.body.role === 'root') {
        return res.status(403).send({ message: `Root role is reserved and cannot be taken` });
    }
    
    sanitize(req.body);
    try {
        const newUser = await User.create({
            username: req.body.username,
            name: normalizeName(req.body.name),
            password: req.body.password,
            email: req.body.email,
            role: req.body.role
        });
        logger.info(`Created new user ${newUser.username}`);
        auditAction(req.user.username, action, resource, newUser.username);


        if (req.body.sendMail && process.env.ENABLE_USER_MAIL === "true") {
            sendMail('staffOnboarding', newUser.email, {
                name: newUser.name,
                user: newUser.username,
                password: req.body.password,
                logInUrl: `${process.env.CORS_ORIGIN}/login`
            });
            const userUpdated = await User.findOneAndUpdate({ username: newUser.username }, { sentMail: true })
            logger.info(`User ${userUpdated.name} updated`);
        }
        
        return res.status(200).send({ message: `User ${newUser.username} created successfully` });
    } catch(err) {
        if (err.code === 11000) {
            logger.verbose(`Username ${req.body.username} already exist`);
            err.message = `Username ${req.body.username} already exist`;
        }
        logger.error(err.message);
        return res.status(400).send({ message: err.message });
    }
}

export async function bulkCreateUser (req,res) {
    const action = 'UPDATE BULK';
    try {
        const { tempFilePath: filePath, mimetype: fileType } = req.files.csv;
        const extension = fileType.split('/')[1];
        if (!extension === 'csv') throw new Error('Only CSV files are supported');
        const userList = await parseCsv(filePath, 'user');

        userList.map(u => {
            u['username'] = createUsername(u.name);
            u['name'] = normalizeName(u.name);
            u['role'] = 'operator';
            u['password'] = createRandomPassword(8);
        });
    
        const users = await User.insertMany(userList);
        logger.info(`Created ${users.length} users in DB from list successfully`);

        if (req.query.sendMail === "true" && process.env.ENABLE_MAIL === "true") {
            for (const u of userList) {
                await sleep(100); // throtle to max 10 mails per second for SES quota (14/s)
                sendMail('staffOnboarding', u.email, {
                    name: u.name,
                    user: u.username,
                    password: u.password,
                    logInUrl: `${process.env.CORS_ORIGIN}/login`
                });
                const userUpdated = await User.findOneAndUpdate({ username: u.username }, { sentMail: true })
                logger.info(`User ${userUpdated.name} updated`);
            }
        }
        
        auditAction(req.user.username, action, resource);
        return res.status(200).send({ message: `${users.length} users were created successfully` });
    } catch (err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function readUser (req, res) {
    const { username } = req.params;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            logger.verbose(`Unexistent user ${username}`);
            return res.status(404).send({ message: `The user ${username} does not exist` });
        }
        logger.info(`Read user ${user.username} successfully`);

        return res.status(200).send({
            user: {
                username: user.username,
                name: user.name,
                role: user.role,
                email: user.email,
                avatar: user.avatar
            },
            message: `User ${user.username} fetched`
        });
    } catch(err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function readUsers (req, res) {
    const valid = ['name', 'role'];
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
    const { limit = 25, page = 1 } = req.query;
    const skip = limit * (page - 1) > 0 ? limit*(page - 1) : 0;
    try {
        const users = await User.find(query)
        .find({ username: { $not: /root/ } })
        .sort({
            name: 1
        })
        .select({
            username: 1,
            name: 1,
            role: 1,
            avatar: 1
        })
        .limit(limit).skip(skip);

        logger.info(`Read ${users.length} users successfully`);

        return res.status(200).send({
            users: users,
            message: `Users fetched successfully`
        });
    } catch(err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function updateUser (req,res) {
    const { username } = req.body;
    const action = 'UPDATE';

    if (req.body.role === 'root' || req.body.username === 'root') {
        return res.status(403).send({ message: `Root is reserved and cannot be taken or updated` });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            logger.verbose(`Unexistent user ${username} cannot be updated`);
            return res.status(404).send({ message: `The user ${username} does not exist` });
        }
        delete req.body.username; // username cannot be overwritten
        for (const p in req.body) { // delete empty values
            if (!req.body[p]) delete req.body[p]
        }
        if (req.body.name) req.body.name = normalizeName(req.body.name);
        Object.assign(user,req.body); // assign updated properties
        const userUpdated = await user.save(); // must be called for the paswword to be hashed
        logger.info(`Updated user ${userUpdated.username} successfully`);
        auditAction(req.user.username, action, resource, userUpdated.username);
        
        return res.status(200).send({ message: `User ${userUpdated.username} updated` });
    } catch(err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    }
}

export async function deleteUser (req,res) {
    const action = 'DELETE';
    let deleteAvatar = false;

    if (req.params.username === 'root') {
        return res.status(403).send({ message: `Root user is reserved and cannot be deleted` });
    }
    
    try {
        const user = await User.findOneAndDelete({ username: req.params.username});
        if (!user) {
            logger.verbose(`Unexistent user ${req.params.username} cannot be deleted`);
            return res.status(404).send({ message: 'Unexistent user' });
        }
        if (user.avatar) deleteAvatar = true;

        // Delete all user's sessions
        await Session.deleteMany({ username: user.username });
        logger.verbose(`Deleted user sessions for ${user.username}`);

        logger.info(`Deleted user ${user.username} successfully`);
        auditAction(req.user.username, action, resource, user.username);

        return res.status(200).send({ message: `User ${user.username} deleted successfully` });
    } catch (err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    } finally {
        try {
            const avatarKey = `${s3UserKeyPrefix}/${req.params.username}/avatar`;
            await deleteObject(avatarKey);
        } catch (err) {
            logger.error(err.message);
        }
    }
}

export async function uploadAvatar (req,res) {
    const action = 'UPDATE';
    const { username } = req.params;
    try {
        logger.verbose(`Received avatar upload for ${username}`);
        const user = await User.findOne({ username });
        if (!user) {
            logger.verbose(`Unexistent user ${username} cannot be updated`);
            return res.status(404).send({ message: `The user ${username} does not exist` });
        }

        const { path, mimetype } = req.file;
        rmPath = path; // This makes it available for finally block
        const extension = mimetype.split('/')[1];
        const avatarKey = `${s3UserKeyPrefix}/${req.params.username}/avatar.${extension}`;
        await uploadObjectFromFile(path, mimetype, avatarKey);
        user.avatar = `${s3BucketUrl}/${avatarKey}`;
        const userUpdated = await user.save();
        logger.info(`Updated user ${userUpdated.username} successfully`);

        auditAction(req.user.username, action, resource, username);

        return res.status(200).send({ message: 'Avatar uploaded correctly' });
    } catch (err) {
        logger.error(err.message);
        return res.status(500).send({ message: err.message });
    } finally {
        if (rmPath) {
            await unLink(rmPath);
            logger.debug(`Removed local ${rmPath} successfully`);
        }
    }
}
