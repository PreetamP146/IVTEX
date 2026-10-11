const express = require('express');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const leadValidator = require('../validators/leadValidator');
const { idParams, timelineQuery } = require('../validators/common');
const { ROLES } = require('../constants');

const createLeadRoutes = ({ leadController, authenticate }) => {
  const router = express.Router();
  const managerial = authorize(ROLES.ADMIN, ROLES.SALES_MANAGER);

  router.use(authenticate);

  router.post('/', validate({ body: leadValidator.create }), leadController.create);
  router.get('/', validate({ query: leadValidator.list }), leadController.list);
  router.get('/:id', validate({ params: idParams }), leadController.getById);
  router.patch(
    '/:id',
    validate({ params: idParams, body: leadValidator.update }),
    leadController.update
  );
  router.patch(
    '/:id/status',
    validate({ params: idParams, body: leadValidator.updateStatus }),
    leadController.updateStatus
  );
  router.patch(
    '/:id/assign',
    managerial,
    validate({ params: idParams, body: leadValidator.assign }),
    leadController.assign
  );
  router.post(
    '/:id/convert',
    validate({ params: idParams, body: leadValidator.convert }),
    leadController.convert
  );
  router.get(
    '/:id/timeline',
    validate({ params: idParams, query: timelineQuery }),
    leadController.timeline
  );
  router.delete('/:id', managerial, validate({ params: idParams }), leadController.remove);

  return router;
};

module.exports = createLeadRoutes;
