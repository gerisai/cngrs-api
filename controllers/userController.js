import User from '../models/user.js';
import logger from '../util/logging.js';
import auditAction from '../util/audit.js';
import { sendMail } from '../util/mailer.js';
import { uploadImage, deleteImage } from '../util/avatar.js';

const resource = 'USER';

export async function createUser (req, res) {
    const action = 'CREATE';

    if (req.body.role == 'root') {
        return res.status(403).send({ message: `Root role is reserved and cannot be taken` });
    }
    
    try {
        const newUser = await User.create({
            username: req.body.username,
            name: req.body.name,
            password: req.body.password,
            email: req.body.email,
            role: req.body.role
        });
        logger.info(`Created new user ${newUser.username}`);
        auditAction(req.user.username, action, resource, newUser.username);

        if (req.body.sendMail && process.env.ENABLE_MAIL) {
            sendMail('staffOnboarding', newUser.email, {
                name: newUser.name,
                user: newUser.username,
                password: req.body.password,
                logInUrl: `${process.env.CORS_ORIGIN}/login`
            });
        }
        
        return res.status(200).send({ message: `User ${newUser.username} created successfully` });
    } catch(err) {
        if (err.code === 11000) {
            logger.verbose(`Username ${req.body.username} already exist`);
            err.message = `Username ${req.body.username} already exist`;
        }
        logger.error(err);
        return res.status(400).send({ message: err.message });
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
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}

export async function readUsers (req, res) {
    try {
        const users = await User.find().select({
            username: 1,
            name: 1,
            role: 1
        });

        const filteredUsers = users.filter((user) => user.username != 'root'); // Root user shall never be returned
        logger.info(`Read all users successfully`);

        return res.status(200).send({
            users: filteredUsers,
            message: `Users fetched successfully`
        });
    } catch(err) {
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}

export async function updateUser (req,res) {
    const { username } = req.body;
    const action = 'UPDATE';

    if (req.body.role == 'root' || req.body.username == 'root') {
        return res.status(403).send({ message: `Root is reserved and cannot be taken or updated` });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            logger.verbose(`Unexistent user ${username} cannot be updated`);
            return res.status(404).send({ message: `The user ${username} does not exist` });
        }
        delete req.body.username; // username cannot be overwritten
        Object.assign(user,req.body); // assign updated properties
        const userUpdated = await user.save(); // must be called for the paswword to be hashed
        logger.info(`Updated user ${userUpdated.username} successfully`);
        auditAction(req.user.username, action, resource, userUpdated.username);
        
        return res.status(200).send({ message: `User ${userUpdated.username} updated` });
    } catch(err) {
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}

export async function deleteUser (req,res) {
    const action = 'DELETE';

    if (req.params.username == 'root') {
        return res.status(403).send({ message: `Root user is reserved and cannot be deleted` });
    }
    
    try {
        const user = await User.findOneAndDelete({ username: req.params.username});
        if (user.avatar) await deleteImage(req.params.username);
        if (!user) {
            logger.verbose(`Unexistent user ${req.params.username} cannot be deleted`);
            return res.status(404).send({ message: 'Unexistent user' });
        }
        logger.info(`Deleted user ${user.username} successfully`);
        auditAction(req.user.username, action, resource, user.username);
        
        return res.status(200).send({ message: `User ${user.username} deleted successfully` });
    } catch (err) {
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}

export async function uploadAvatar (req,res) {
    const { username } = req.params;
    const { tempFilePath: filePath, mimetype: fileType } = req.files.avatar;
    logger.verbose(`Received avatar upload for ${username}`);
    const extension = fileType.split('/')[1];
    try {
        await uploadImage(filePath, extension, username);
        const user = await User.findOne({ username });
        user.avatar = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/staff/${username}/avatar`
        await user.save();
        return res.status(200).send({ message: 'Avatar uploaded correctly' });
    } catch (err) {
        logger.error(err);
        return res.status(500).send({ message: err.message });
    }
}