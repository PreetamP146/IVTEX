const express = require('express');
const createAuthRoutes = require('./authRoutes');
const createUserRoutes = require('./userRoutes');
const createLeadRoutes = require('./leadRoutes');
const createCustomerRoutes = require('./customerRoutes');
const createDealRoutes = require('./dealRoutes');
const createActivityRoutes = require('./activityRoutes');
const createDashboardRoutes = require('./dashboardRoutes');

const createApiRouter = (dependencies) => {
  const router = express.Router();

  router.use('/auth', createAuthRoutes(dependencies));
  router.use('/users', createUserRoutes(dependencies));
  router.use('/leads', createLeadRoutes(dependencies));
  router.use('/customers', createCustomerRoutes(dependencies));
  router.use('/deals', createDealRoutes(dependencies));
  router.use('/activities', createActivityRoutes(dependencies));
  router.use('/dashboard', createDashboardRoutes(dependencies));

  return router;
};

module.exports = createApiRouter;
