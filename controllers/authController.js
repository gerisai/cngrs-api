import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import logger from '../util/logging.js';
import roleMappings from '../util/roleMappings.js';

function signToken(user) {
    return jwt.sign({ user }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

function createToken (user, code, req, res) {
    const token = signToken(user);

    logger.verbose(`Created user token for ${user.username}`);

    // configure cookie in response
    res.cookie('token', token, {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        sameSite: process.env.NODE_ENV !== 'production' ? 'Lax' : 'None'
    });

    logger.verbose(`Set token cookie for ${user.username}`);

    return res.status(code).send({
        message: 'Successfully created user token',
        user: {
            username: user.username,
            name: user.name,
            role: user.role, // TODO: Be careful with how you store this
            avatar: user.avatar
        }
    });
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
            return createToken({
                username: user.username,
                name: user.name,
                role: user.role,
                avatar: user.avatar
            }, 200, req, res);
        }
        logger.warn(`Failed login attempt by user ${username}`);
        return res.status(401).send({ message: 'Incorrect username or password' });
    } catch(err) {
        logger.error(err);
        return res.status(500).send({ message: `Unexpected error, please try again: ${err.message}` });
    }
}

export async function checkAuth (req,res, next) {
    if (req.cookies.token) {
        const { token } = req.cookies;

        try {
            const { user } = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
            logger.verbose('Decoded JWT successfully'); // TODO: Saving money by not verifying user existence in DB
            logger.verbose(`User ${user.username} is authenticated`);
            req.user = user;
            next();
        } catch (err) {
            if (err.name == 'TokenExpiredError') {
                logger.warn('User token is expired');
                return res.status(401).send({ message: 'Unauthorized: Session has expired' });
            }
            res.clearCookie('token');
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
    const policies = roleMappings[user.role];

    for (const policy of policies) {
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
    const { token } = req.cookies;

    try {
        const { user } = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        logger.verbose('Decoded JWT successfully'); // TODO: Saving money by not verifying user existence in DB
        logger.verbose(`User ${user.username} is authenticated`);
        return res.status(200).send({ user });
    } catch (err) {
        return res.status(403).send({ message: 'No auth user found'});
    }
}

export async function logout (_,res) {
    res.clearCookie('token');
    logger.verbose('User logged out');
    return res.status(200).send({ message: 'User logged out' });
}
