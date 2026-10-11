const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  stats = asyncHandler(async (req, res) => {
    const stats = await this.dashboardService.getStats(req.user);
    sendSuccess(res, { message: 'Dashboard statistics fetched successfully', data: stats });
  });

  pipeline = asyncHandler(async (req, res) => {
    const pipeline = await this.dashboardService.getPipeline(req.user);
    sendSuccess(res, { message: 'Sales pipeline fetched successfully', data: pipeline });
  });

  teamPerformance = asyncHandler(async (req, res) => {
    const performance = await this.dashboardService.getTeamPerformance(req.user);
    sendSuccess(res, { message: 'Team performance fetched successfully', data: performance });
  });
}

module.exports = DashboardController;
