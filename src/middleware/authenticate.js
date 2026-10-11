const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const createAuthenticate = ({ tokenService, userRepository }) =>
  asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Authentication token is missing');
    }

    let payload;
    try {
      payload = tokenService.verifyAccessToken(token);
    } catch (error) {
      throw ApiError.unauthorized('Invalid or expired authentication token');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('This account has been deactivated');
    }

    req.user = user;
    next();
  });

module.exports = createAuthenticate;
