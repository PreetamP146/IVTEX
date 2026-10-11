const express = require('express');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const userValidator = require('../validators/userValidator');
const { idParams } = require('../validators/common');
const { ROLES } = require('../constants');

const createUserRoutes = ({ userController, authenticate }) => {
  const router = express.Router();
  const adminOnly = authorize(ROLES.ADMIN);

  router.use(authenticate);

  router.get(
    '/team',
    authorize(ROLES.ADMIN, ROLES.SALES_MANAGER),
    validate({ query: userValidator.team }),
    userController.team
  );

  router.post('/', adminOnly, validate({ body: userValidator.create }), userController.create);
  router.get('/', adminOnly, validate({ query: userValidator.list }), userController.list);
  router.get('/:id', adminOnly, validate({ params: idParams }), userController.getById);
  router.patch(
    '/:id',
    adminOnly,
    validate({ params: idParams, body: userValidator.update }),
    userController.update
  );
  router.patch(
    '/:id/status',
    adminOnly,
    validate({ params: idParams, body: userValidator.setStatus }),
    userController.setStatus
  );
  router.delete('/:id', adminOnly, validate({ params: idParams }), userController.remove);

  return router;
};

module.exports = createUserRoutes;
