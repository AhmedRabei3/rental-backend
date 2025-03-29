const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

// Connect to MongoDB
module.exports.connectToMongoDB = asyncHandler(async () => {
  mongoose
    .connect(process.env.DB_URL)
    .then(() => console.log("Connected to MongoDB..."))
    .catch((err) => console.error("Could not connect to MongoDB...", err));
});
