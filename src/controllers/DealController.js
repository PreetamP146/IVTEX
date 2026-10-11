const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');

class DealController {
  constructor(dealService) {
    this.dealService = dealService;
  }

  create = asyncHandler(async (req, res) => {
    const deal = await this.dealService.create(req.user, req.body);
    sendSuccess(res, { status: 201, message: 'Deal created successfully', data: deal });
  });

  list = asyncHandler(async (req, res) => {
    const result = await this.dealService.list(req.user, req.query);
    sendPaginated(res, { message: 'Deals fetched successfully', result });
  });

  getById = asyncHandler(async (req, res) => {
    const deal = await this.dealService.getById(req.user, req.params.id);
    sendSuccess(res, { message: 'Deal fetched successfully', data: deal });
  });

  update = asyncHandler(async (req, res) => {
    const deal = await this.dealService.update(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'Deal updated successfully', data: deal });
  });

  changeStage = asyncHandler(async (req, res) => {
    const deal = await this.dealService.changeStage(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'Deal stage updated successfully', data: deal });
  });

  assign = asyncHandler(async (req, res) => {
    const deal = await this.dealService.assign(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'Deal assigned successfully', data: deal });
  });

  remove = asyncHandler(async (req, res) => {
    await this.dealService.remove(req.user, req.params.id);
    sendSuccess(res, { message: 'Deal deleted successfully' });
  });

  timeline = asyncHandler(async (req, res) => {
    const result = await this.dealService.getTimeline(req.user, req.params.id, req.query);
    sendPaginated(res, { message: 'Deal timeline fetched successfully', result });
  });
}

module.exports = DealController;
