const mongoose = require('mongoose');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

const connectDatabase = async (uri) => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  logger.info('MongoDB connected');
};

const disconnectDatabase = async () => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};

module.exports = { connectDatabase, disconnectDatabase };
