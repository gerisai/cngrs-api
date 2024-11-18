import User from '../models/user.js';
import Session from '../models/session.js';
import UserSession from '../models/usersession.js';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import logger from '../util/logging.js';
import getRoleMappings from '../util/roleMappings.js';

function signToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

function createToken (user) {
    const token = signToken(user._id);
    logger.verbose(`Created user token for ${user.username}`);
    return token;
}

async function decodeToken (token) {
    try {
        const user = await UserSession.findOne({ token });
        await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        logger.verbose('Decoded JWT successfully');
        if (!user) {
            logger.verbose('Unexistent JWT');
            throw new Error(`The auth token is not valid`); // DO NOT INCLUDE username for security reasons
        }
        logger.verbose(`User ${user.username} is authenticated`);
        return user;
    } catch(err) {
        if (err.name === 'TokenExpiredError') {
            logger.warn('User token is expired. Deleting it.');
            await Session.findOneAndDelete({ token });
        }
        throw new Error(err);
    }
}

export async function login (req, res) {
    const { username, password } = req.body;

    // Check payload
    if (!username || !password) {
        logger.info('Username and/or password not provided for login.');
        return res.status(400).send({ message: 'Username and password are required' });
    }

    // Check log in details
    const user = await User.findOne({ username });
    if (!user) {
        logger.info(`Unexistent user ${username} cannot login`);
        return res.status(404).send({ message: 'User does not exist' });
    }

    try {
        const isMatch = await user.comparePassword(password);
        if (isMatch) {

            logger.info(`User ${username} logged in`);

            const token = createToken(user);

            const session = await Session.create({
                username,
                token
            });
            logger.info(`Added JWT token for ${session.username}`);

            return res.status(200).send({
                message: 'Successfully created user token',
                user: {
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    avatar: user.avatar
                },
                token
            });
        }
        logger.warn(`Failed login attempt by user ${username}`);
        return res.status(401).send({ message: 'Incorrect username or password' });
    } catch(err) {
        logger.error(err);
        return res.status(500).send({ message: `Unexpected error, please try again: ${err.message}` });
    }
}

export async function checkAuth (req,res, next) {
    if (req.get('Authorization')) {
        const token = req.get('Authorization').split(" ")[1];

        try {
            const user = await decodeToken(token);
            req.user = user;
            next();
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).send({ message: 'Unauthorized: Session has expired' });
            }
            logger.error(err);
            return res.status(500).send({ message: `Authentication failure: ${err.message}` });
        }
    } else {
        logger.warn('User is not authenticated');
        return res.status(403).send({ message: 'Forbbiden: User has not logged in' });
    }
}

export async function checkRole (req,res,next) {
    const { user, originalUrl, method } = req;
    logger.verbose(`Checking authorization level for ${user.username} with role ${user.role}`);
    let isAuthorized = false;
    const roleMappings = getRoleMappings(user.username);
    const policies = roleMappings[user.role];

    for (const policy of policies) {
        if (typeof policy)
        isAuthorized = policy.path.test(originalUrl) && policy.verbs.includes(method);
        if (isAuthorized) break;
    }
    
    if (isAuthorized) {
        next();
    } else {
        logger.warn(`User ${user.username} with role ${user.role} cannot perform ${req.method} on ${req.originalUrl}`);
        return res.status(403).send({ message: 'Unauthorized' });
    }
}

export async function getAuthUser (req,res) {
    if (req.get('Authorization')) {
        const token = req.get('Authorization').split(" ")[1];

        try {
            const user = await decodeToken(token);
            return res.status(200).send({ user });
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).send({ message: 'Unauthorized: Session has expired' });
            }
            logger.error(err);
            return res.status(500).send({ message: `Authentication failure: ${err.message}` });
        }
    } else {
        logger.warn('User is not authenticated');
        return res.status(403).send({ message: 'Forbbiden: User has not logged in' });
    }
}

export async function logout (req,res) {
    if (req.get('Authorization')) {
        const token = req.get('Authorization').split(" ")[1];
        try {
            await Session.findOneAndDelete({ token });
            logger.verbose('User logged out');
            return res.status(200).send({ message: 'User logged out' });
        } catch (err) {
            logger.error(err);
            return res.status(500).send({ message: `Failed to logout: ${err.message}` });
        }
    }
    else {
        logger.warn('User is not authenticated');
        return res.status(403).send({ message: 'Forbbiden: User has not logged in' });
    }
}
