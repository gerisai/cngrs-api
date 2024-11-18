import mongoose from 'mongoose';

// MongoDB View
const UserSessionSchema = new mongoose.Schema({
    username: String,
    name: String,
    role: String,
    token: String,
});

const UserSession = mongoose.model("UserSession", UserSessionSchema, "UserSessions");

export default UserSession;
