const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const openApiSpec = require('./docs/openapi');
const createApiRouter = require('./routes');
const { createLimiter } = require('./middleware/rateLimiters');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const createApp = (dependencies) => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(
    createLimiter({ windowMs: config.rateLimit.windowMs, max: config.rateLimit.max })
  );

  app.get('/health', (req, res) => {
    res.json({ success: true, message: 'Service is healthy', data: { uptime: process.uptime() } });
  });

  app.use('/api/v1', createApiRouter(dependencies));

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
