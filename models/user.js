import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_WORK_FACTOR = 10;

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        validate: {
            validator: function(v) {
                return /^[a-z]+$/.test(v);
            },
            message: () => 'Username can only contain lowercase letters'
        }
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        uppercase: true,
        validate: {
            validator: function(v) {
                return /^[a-zA-Z\ ]+$/.test(v);
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
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    role: {
        type: String,
        enum: {
            values: ['operator', 'admin'],
            message: '{VALUE} is not a valid role'
        },
        default: 'operator'
    }
});

UserSchema.pre('save', function(next) {
    var user = this; // required for scoping within call backs
    if (!user.isModified('password')) return next();
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err)

        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err)

            user.password = hash;
            next();
        })
    })
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        return isMatch
    } catch(err) {
        throw new Error(err);
    }
}

const User = mongoose.model("User", UserSchema);

export default User;