const express = require('express');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const customerValidator = require('../validators/customerValidator');
const { idParams, timelineQuery } = require('../validators/common');
const { ROLES } = require('../constants');

const createCustomerRoutes = ({ customerController, authenticate }) => {
  const router = express.Router();

  router.use(authenticate);

  router.post('/', validate({ body: customerValidator.create }), customerController.create);
  router.get('/', validate({ query: customerValidator.list }), customerController.list);
  router.get('/:id', validate({ params: idParams }), customerController.getById);
  router.patch(
    '/:id',
    validate({ params: idParams, body: customerValidator.update }),
    customerController.update
  );
  router.get(
    '/:id/timeline',
    validate({ params: idParams, query: timelineQuery }),
    customerController.timeline
  );
  router.delete(
    '/:id',
    authorize(ROLES.ADMIN, ROLES.SALES_MANAGER),
    validate({ params: idParams }),
    customerController.remove
  );

  return router;
};

module.exports = createCustomerRoutes;
