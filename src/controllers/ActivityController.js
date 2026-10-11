const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');

class ActivityController {
  constructor(activityService) {
    this.activityService = activityService;
  }

  create = asyncHandler(async (req, res) => {
    const activity = await this.activityService.create(req.user, req.body);
    sendSuccess(res, { status: 201, message: 'Activity created successfully', data: activity });
  });

  list = asyncHandler(async (req, res) => {
    const result = await this.activityService.list(req.user, req.query);
    sendPaginated(res, { message: 'Activities fetched successfully', result });
  });

  getById = asyncHandler(async (req, res) => {
    const activity = await this.activityService.getById(req.user, req.params.id);
    sendSuccess(res, { message: 'Activity fetched successfully', data: activity });
  });

  update = asyncHandler(async (req, res) => {
    const activity = await this.activityService.update(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'Activity updated successfully', data: activity });
  });

  complete = asyncHandler(async (req, res) => {
    const activity = await this.activityService.complete(req.user, req.params.id);
    sendSuccess(res, { message: 'Activity marked as completed', data: activity });
  });

  remove = asyncHandler(async (req, res) => {
    await this.activityService.remove(req.user, req.params.id);
    sendSuccess(res, { message: 'Activity deleted successfully' });
  });
}

module.exports = ActivityController;
