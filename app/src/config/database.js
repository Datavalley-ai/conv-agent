const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./index');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
