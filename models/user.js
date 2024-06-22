import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_WORK_FACTOR = 10;

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        uppercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'readonly'
    }
});

UserSchema.pre('save', function(next) {
    var user = this; // required for scoping within call backs
    if (!user.isModified('password')) return next();
    console.log('called!')
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err)

        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err)

            user.password = hash;
            next();
        })
    })
});

UserSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
}

const User = mongoose.model("User", UserSchema);

export default User;