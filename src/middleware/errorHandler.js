const mongoose = require('mongoose');
const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');
const logger = require('../utils/logger');

const formatZodIssues = (error) =>
  error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));

const formatMongooseIssues = (error) =>
  Object.values(error.errors).map((issue) => ({ field: issue.path, message: issue.message }));

const normalize = (error) => {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof ZodError) {
    return ApiError.badRequest('Validation failed', formatZodIssues(error));
  }
  if (error instanceof mongoose.Error.ValidationError) {
    return ApiError.badRequest('Validation failed', formatMongooseIssues(error));
  }
  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for ${error.path}`);
  }
  if (error.code === 11000) {
    const fields = Object.keys(error.keyPattern || {}).join(', ') || 'field';
    return ApiError.conflict(`Duplicate value for ${fields}`);
  }
  if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
    return ApiError.unauthorized('Invalid or expired authentication token');
  }
  if (error.type === 'entity.parse.failed') {
    return ApiError.badRequest('Malformed JSON in request body');
  }
  if (error.type === 'entity.too.large') {
    return new ApiError(413, 'Request body is too large');
  }
  if (error.message && error.message.startsWith('Not allowed by CORS')) {
    return ApiError.forbidden('Origin is not allowed');
  }
  return new ApiError(500, 'Something went wrong on our side');
};

const errorHandler = (error, req, res, next) => {
  const apiError = normalize(error);

  if (apiError.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${error.message}`);
  }

  const body = { success: false, message: apiError.message };
  if (apiError.errors) {
    body.errors = apiError.errors;
  }
  if (!config.isProduction && apiError.statusCode >= 500) {
    body.stack = error.stack;
  }
  res.status(apiError.statusCode).json(body);
};

module.exports = errorHandler;
