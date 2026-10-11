const config = require('./config/env');
const logger = require('./utils/logger');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const buildContainer = require('./container');
const createApp = require('./app');

const start = async () => {
  await connectDatabase(config.mongoUri);

  const app = createApp(buildContainer());
  const server = app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port} in ${config.nodeEnv} mode`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.message : reason}`);
});

start().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});
