const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendPaginated } = require('../utils/apiResponse');

class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  create = asyncHandler(async (req, res) => {
    const user = await this.userService.create(req.body);
    sendSuccess(res, { status: 201, message: 'User created successfully', data: user });
  });

  list = asyncHandler(async (req, res) => {
    const result = await this.userService.list(req.query);
    sendPaginated(res, { message: 'Users fetched successfully', result });
  });

  team = asyncHandler(async (req, res) => {
    const result = await this.userService.listTeam(req.user, req.query);
    sendPaginated(res, { message: 'Team members fetched successfully', result });
  });

  getById = asyncHandler(async (req, res) => {
    const user = await this.userService.getById(req.params.id);
    sendSuccess(res, { message: 'User fetched successfully', data: user });
  });

  update = asyncHandler(async (req, res) => {
    const user = await this.userService.update(req.user, req.params.id, req.body);
    sendSuccess(res, { message: 'User updated successfully', data: user });
  });

  setStatus = asyncHandler(async (req, res) => {
    const user = await this.userService.setActive(req.user, req.params.id, req.body.isActive);
    sendSuccess(res, {
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
    });
  });

  remove = asyncHandler(async (req, res) => {
    await this.userService.remove(req.user, req.params.id);
    sendSuccess(res, { message: 'User deleted successfully' });
  });
}

module.exports = UserController;
