import mongoose from 'mongoose';

const PersonSchema = new mongoose.Schema({
    personId: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^[a-z]+$/.test(v);
            },
            message: () => 'PersonID can only contain lowercase letters'
        }
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        uppercase: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^[a-zA-ZÀ-ž\ ]+$/.test(v);
            },
            message: () => 'Username can only contain letters and spaces'
        }
    },
    email: {
        type: String,
        required: [true,'Email is required'],
        unique: true,
        validate: {
            validator: function(v) {
                return /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i.test(v);
            },
            message: (props) => `${props.value} is not a valid email`
        }
    },
    accessed: {
        type: Boolean,
        default: false
    },
    gender: {
        type: String,
        required: [true, "Gender is required"],
        enum: {
            values: ['male', 'female'],
            message: '{VALUE} is not a valid role'
        }
    },
    cellphone: {
        type: Number,
        required: [true, "Number is required"]
    },
    age: {
        type: Number
    },
    activity: {
        type: String
    },
    sentMail: {
        type: String,
        default: true
    },
    city: String,
    illness: String,
    tutor: String,
    zone: String,
    branch: String,
    room: String,
});

const Person = mongoose.model("Person", PersonSchema);

export default Person;
