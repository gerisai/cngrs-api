import mongoose from 'mongoose';

//Set up MongoDB
const uri = `${process.env.DB_STRING}`;

(async () => {
    try {
        await mongoose.connect(uri);
        console.log("Connected to DB");

        const db = mongoose.connection.db;
        await db.createCollection("UserSessions", {
            viewOn: "sessions",
            pipeline: [
                {
                    $lookup: {
                        from: 'users',
                        localField: 'username',
                        foreignField: 'username',
                        as: 'user'
                    }
                },
                {
                    $project: {
                        _id: 0,
                        token: 1,
                        username: 1,
                        name: "$user.name",
                        role: "$user.role",
                        avatar: "$user.avatar"
                    }
                },
                { $unwind: "$name" },
                { $unwind: "$role" },
                { $unwind: "$avatar" }
            ]
        });

        console.log("View created successfully!");
    } catch (err) {
        console.error("Error:", err);
    } finally {
        mongoose.disconnect();
    }
})();
