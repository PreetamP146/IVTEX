const express = require('express');
const validate = require('../middleware/validate');
const activityValidator = require('../validators/activityValidator');
const { idParams } = require('../validators/common');

const createActivityRoutes = ({ activityController, authenticate }) => {
  const router = express.Router();

  router.use(authenticate);

  router.post('/', validate({ body: activityValidator.create }), activityController.create);
  router.get('/', validate({ query: activityValidator.list }), activityController.list);
  router.get('/:id', validate({ params: idParams }), activityController.getById);
  router.patch(
    '/:id',
    validate({ params: idParams, body: activityValidator.update }),
    activityController.update
  );
  router.patch('/:id/complete', validate({ params: idParams }), activityController.complete);
  router.delete('/:id', validate({ params: idParams }), activityController.remove);

  return router;
};

module.exports = createActivityRoutes;
