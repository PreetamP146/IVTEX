const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');

class LeadController {
  constructor({ leadService, leadConversionService }) {
    this.leadService = leadService;
    this.leadConversionService = leadConversionService;
  }

  create = asyncHandler(async (req, res) => {
    const lead = await this.leadService.create(req.user, req.body);
    sendSuccess(res, { status: 201, message: 'Lead created successfully', data: lead });
  });

  list = asyncHandler(async (req, res) => {
    const result = await this.leadService.list(req.user, req.query);
    sendPaginated(res, { message: 'Leads fetched successfully', result });
  });

  getById = asyncHandler(async (req, res) => {
    const lead = await this.leadService.getById(req.user, req.params.id);
    sendSuccess(res, { message: 'Lead fetched successfully', data: lead });
  });

  update = asyncHandler(async (req, res) => {
    const lead = await this.leadService.update(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'Lead updated successfully', data: lead });
  });

  updateStatus = asyncHandler(async (req, res) => {
    const lead = await this.leadService.updateStatus(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'Lead status updated successfully', data: lead });
  });

  assign = asyncHandler(async (req, res) => {
    const lead = await this.leadService.assign(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'Lead assigned successfully', data: lead });
  });

  convert = asyncHandler(async (req, res) => {
    const result = await this.leadConversionService.convert(req.user, req.params.id, req.body);
    sendSuccess(res, { status: 201, message: 'Lead converted successfully', data: result });
  });

  remove = asyncHandler(async (req, res) => {
    await this.leadService.remove(req.user, req.params.id);
    sendSuccess(res, { message: 'Lead deleted successfully' });
  });

  timeline = asyncHandler(async (req, res) => {
    const result = await this.leadService.getTimeline(req.user, req.params.id, req.query);
    sendPaginated(res, { message: 'Lead timeline fetched successfully', result });
  });
}

module.exports = LeadController;
