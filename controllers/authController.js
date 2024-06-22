import User from '../models/user.js';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';

function signToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

export function createToken (user, code, req, res) {
    const token = signToken(user.username);

    // configure cookie in response
    res.cookie('token', token, {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
    });

    // remove user password from output
    user.password = undefined;
    return res.status(code).send({
        status: 'Successfully created user token',
        data: {
            user
        }
    });
}

export async function login (req, res) {
    const { username, password } = req.body;

    // check payload
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    // check log in details
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(404).send('User does not exist');
    }

    user.comparePassword(password, function (err, isMatch){
        if(err) return res.status(500).send(`Unexpected error, please try again. Details: ${err.message}`);
        if (isMatch) return createToken(user, 200, req, res);
        
        return res.status(401).send('Incorrect username or password');
    });
}

export async function checkAuth (req,res) {
    let currentUser;

    if (req.cookies.token) {
        const { token } = req.cookies;

        try {
            const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
            currentUser = await User.findOne({ username: decoded.id });
            return res.status(200).send({ username: currentUser.username });
        } catch (err) {
            res.clearCookie('token');
            return res.status(500).send(err.message)
        }
    } else {
        return res.status(403).send('Unauthorized');
    }
}

export async function logout (_,res) {
    res.clearCookie('token');
    return res.status(200).send('User logged out');
}
