const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');

class CustomerController {
  constructor(customerService) {
    this.customerService = customerService;
  }

  create = asyncHandler(async (req, res) => {
    const customer = await this.customerService.create(req.user, req.body);
    sendSuccess(res, { status: 201, message: 'Customer created successfully', data: customer });
  });

  list = asyncHandler(async (req, res) => {
    const result = await this.customerService.list(req.user, req.query);
    sendPaginated(res, { message: 'Customers fetched successfully', result });
  });

  getById = asyncHandler(async (req, res) => {
    const customer = await this.customerService.getById(req.user, req.params.id);
    sendSuccess(res, { message: 'Customer fetched successfully', data: customer });
  });

  update = asyncHandler(async (req, res) => {
    const customer = await this.customerService.update(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'Customer updated successfully', data: customer });
  });

  remove = asyncHandler(async (req, res) => {
    await this.customerService.remove(req.user, req.params.id);
    sendSuccess(res, { message: 'Customer deleted successfully' });
  });

  timeline = asyncHandler(async (req, res) => {
    const result = await this.customerService.getTimeline(req.user, req.params.id, req.query);
    sendPaginated(res, { message: 'Customer timeline fetched successfully', result });
  });
}

module.exports = CustomerController;
