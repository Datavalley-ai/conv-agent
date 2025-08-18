// /app/src/config/database.js

const mongoose = require('mongoose');
const logger = require('../utils/logger'); // Assuming a logger utility exists

const connectDB = async () => {
    try {
        // Retrieve the MongoDB connection string from environment variables.
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            logger.error('FATAL: MONGODB_URI is not defined in the environment variables.');
            process.exit(1); // Exit the process with a failure code.
        }

        // Mongoose connection options for modern best practices.
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Fail fast if the DB isn't available
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        };

        await mongoose.connect(mongoURI, options);
        
        logger.info('✅ MongoDB connection established successfully.');

    } catch (error) {
        logger.error('MongoDB connection failed:', error.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;