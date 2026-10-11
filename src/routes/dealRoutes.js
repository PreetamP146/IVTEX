const express = require('express');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const dealValidator = require('../validators/dealValidator');
const { idParams, timelineQuery } = require('../validators/common');
const { ROLES } = require('../constants');

const createDealRoutes = ({ dealController, authenticate }) => {
  const router = express.Router();
  const managerial = authorize(ROLES.ADMIN, ROLES.SALES_MANAGER);

  router.use(authenticate);

  router.post('/', validate({ body: dealValidator.create }), dealController.create);
  router.get('/', validate({ query: dealValidator.list }), dealController.list);
  router.get('/:id', validate({ params: idParams }), dealController.getById);
  router.patch(
    '/:id',
    validate({ params: idParams, body: dealValidator.update }),
    dealController.update
  );
  router.patch(
    '/:id/stage',
    validate({ params: idParams, body: dealValidator.changeStage }),
    dealController.changeStage
  );
  router.patch(
    '/:id/assign',
    managerial,
    validate({ params: idParams, body: dealValidator.assign }),
    dealController.assign
  );
  router.get(
    '/:id/timeline',
    validate({ params: idParams, query: timelineQuery }),
    dealController.timeline
  );
  router.delete('/:id', managerial, validate({ params: idParams }), dealController.remove);

  return router;
};

module.exports = createDealRoutes;
