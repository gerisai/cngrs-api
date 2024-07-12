import mongoose from 'mongoose';

const PersonSchema = new mongoose.Schema({
    personId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        uppercase: true,
        unique: true
    },
    registered: {
        type: Boolean,
        required: true,
        default: false
    },
    room: String
});

const Person = mongoose.model("Person", PersonSchema);

export default Person;
