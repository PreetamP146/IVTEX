const ApiError = require('../utils/ApiError');

const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Your role is not permitted to perform this action'));
    }
    return next();
  };

module.exports = authorize;
