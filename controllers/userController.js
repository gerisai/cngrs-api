import User from '../models/user.js';

export async function createUser (req, res) {
    try {
        const newUser = await User.create({
            username: req.body.username,
            name: req.body.name,
            password: req.body.password,
            role: req.body.role
        });
        return res.status(200).send(`User ${newUser.username} created successfully`);
    } catch(err) {
        if (err.code === 11000) err.message = `Username ${req.body.username} already exist`;
        return res.status(400).send(err.message);
    }
}

export async function updateUser (req,res) {
    const { username } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(404).send(`The user ${username} does not exist`);
        delete req.body.username; // username cannot be overwritten
        Object.assign(user,req.body); // assign updated properties
        const userUpdated = await user.save(); // must be called for the paswword to be hashed
        return res.status(200).send(`User ${userUpdated.username} updated`);
    } catch(err) {
        console.error(err);
        return res.status(500).send(err.message)
    }
}

export async function deleteUser (req,res) {
    try {
        const user = await User.findOneAndDelete({ username: req.params.username});
        if (!user) return res.status(404).send('Unexistent user');
        return res.status(200).send(`User ${user.username} deleted successfully`);
    } catch (err) {
        return res.status(500).send(err.message);
    }
}
