const config = require('./config/env');
const PasswordHasher = require('./utils/passwordHasher');
const TokenService = require('./utils/tokenService');
const TransactionRunner = require('./utils/transactionRunner');
const { createLimiter } = require('./middleware/rateLimiters');
const createAuthenticate = require('./middleware/authenticate');

const UserRepository = require('./repositories/UserRepository');
const LeadRepository = require('./repositories/LeadRepository');
const CustomerRepository = require('./repositories/CustomerRepository');
const DealRepository = require('./repositories/DealRepository');
const ActivityRepository = require('./repositories/ActivityRepository');
const TimelineRepository = require('./repositories/TimelineRepository');

const AccessScopeService = require('./services/AccessScopeService');
const AssigneeService = require('./services/AssigneeService');
const TimelineService = require('./services/TimelineService');
const AuthService = require('./services/AuthService');
const UserOwnershipService = require('./services/UserOwnershipService');
const UserService = require('./services/UserService');
const LeadService = require('./services/LeadService');
const LeadConversionService = require('./services/LeadConversionService');
const CustomerService = require('./services/CustomerService');
const DealService = require('./services/DealService');
const RelatedEntityResolver = require('./services/RelatedEntityResolver');
const ActivityService = require('./services/ActivityService');
const DashboardService = require('./services/DashboardService');

const AuthController = require('./controllers/AuthController');
const UserController = require('./controllers/UserController');
const LeadController = require('./controllers/LeadController');
const CustomerController = require('./controllers/CustomerController');
const DealController = require('./controllers/DealController');
const ActivityController = require('./controllers/ActivityController');
const DashboardController = require('./controllers/DashboardController');

const buildContainer = () => {
  const passwordHasher = new PasswordHasher(config.bcryptSaltRounds);
  const tokenService = new TokenService(config.jwt);
  const transactionRunner = new TransactionRunner();

  const userRepository = new UserRepository();
  const leadRepository = new LeadRepository();
  const customerRepository = new CustomerRepository();
  const dealRepository = new DealRepository();
  const activityRepository = new ActivityRepository();
  const timelineRepository = new TimelineRepository();

  const accessScope = new AccessScopeService(userRepository);
  const assigneeService = new AssigneeService(userRepository, accessScope);
  const timelineService = new TimelineService(timelineRepository);
  const userOwnershipService = new UserOwnershipService({
    leadRepository,
    customerRepository,
    dealRepository,
    activityRepository,
  });
  const relatedEntityResolver = new RelatedEntityResolver({
    leadRepository,
    customerRepository,
    dealRepository,
    userRepository,
    accessScope,
  });

  const authService = new AuthService({ userRepository, passwordHasher, tokenService });
  const userService = new UserService({ userRepository, passwordHasher, userOwnershipService });
  const leadService = new LeadService({
    leadRepository,
    accessScope,
    assigneeService,
    timelineService,
  });
  const leadConversionService = new LeadConversionService({
    leadRepository,
    customerRepository,
    dealRepository,
    accessScope,
    timelineService,
    transactionRunner,
  });
  const customerService = new CustomerService({
    customerRepository,
    dealRepository,
    accessScope,
    assigneeService,
    timelineService,
  });
  const dealService = new DealService({
    dealRepository,
    customerRepository,
    accessScope,
    assigneeService,
    timelineService,
  });
  const activityService = new ActivityService({
    activityRepository,
    accessScope,
    assigneeService,
    relatedEntityResolver,
    timelineService,
  });
  const dashboardService = new DashboardService({
    leadRepository,
    customerRepository,
    dealRepository,
    activityRepository,
    userRepository,
    accessScope,
  });

  return {
    authenticate: createAuthenticate({ tokenService, userRepository }),
    authLimiter: createLimiter({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.authMax,
    }),
    authController: new AuthController({
      authService,
      tokenService,
      isProduction: config.isProduction,
    }),
    userController: new UserController(userService),
    leadController: new LeadController({ leadService, leadConversionService }),
    customerController: new CustomerController(customerService),
    dealController: new DealController(dealService),
    activityController: new ActivityController(activityService),
    dashboardController: new DashboardController(dashboardService),
  };
};

module.exports = buildContainer;
