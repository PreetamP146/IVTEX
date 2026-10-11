const express = require('express');
const validate = require('../middleware/validate');
const authValidator = require('../validators/authValidator');

const createAuthRoutes = ({ authController, authenticate, authLimiter }) => {
  const router = express.Router();

  router.post('/register', authLimiter, validate({ body: authValidator.register }), authController.register);
  router.post('/login', authLimiter, validate({ body: authValidator.login }), authController.login);
  router.post('/refresh', authLimiter, authController.refresh);
  router.post('/logout', authController.logout);
  router.get('/me', authenticate, authController.me);
  router.patch(
    '/change-password',
    authenticate,
    validate({ body: authValidator.changePassword }),
    authController.changePassword
  );

  return router;
};

module.exports = createAuthRoutes;
