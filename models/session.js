import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        validate: {
            validator: function(v) {
                return /^[a-z]+$/.test(v);
            },
            message: () => 'Username can only contain lowercase letters'
        }
    },
    token: {
        type: String,
        required: true,
        unique: true
    }
});

const Session = mongoose.model("Session", SessionSchema);

export default Session;
