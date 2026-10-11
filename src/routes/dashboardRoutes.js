const express = require('express');
const authorize = require('../middleware/authorize');
const { ROLES } = require('../constants');

const createDashboardRoutes = ({ dashboardController, authenticate }) => {
  const router = express.Router();

  router.use(authenticate);

  router.get('/stats', dashboardController.stats);
  router.get('/pipeline', dashboardController.pipeline);
  router.get(
    '/team-performance',
    authorize(ROLES.ADMIN, ROLES.SALES_MANAGER),
    dashboardController.teamPerformance
  );

  return router;
};

module.exports = createDashboardRoutes;
