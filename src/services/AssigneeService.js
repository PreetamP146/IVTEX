const ApiError = require('../utils/ApiError');
const { ROLES } = require('../constants');

class AssigneeService {
  constructor(userRepository, accessScope) {
    this.userRepository = userRepository;
    this.accessScope = accessScope;
  }

  async resolveOwner(actor, requestedId) {
    if (actor.role === ROLES.SALES_EXECUTIVE) {
      return actor._id;
    }
    if (!requestedId) {
      return null;
    }
    const assignee = await this.assertAssignable(actor, requestedId);
    return assignee._id;
  }

  async assertAssignable(actor, assigneeId, { roles = [ROLES.SALES_EXECUTIVE] } = {}) {
    const assignee = await this.userRepository.findById(assigneeId);
    if (!assignee) {
      throw ApiError.notFound('Assignee not found');
    }
    if (!assignee.isActive) {
      throw ApiError.badRequest('Cannot assign work to an inactive user');
    }
    if (!roles.includes(assignee.role)) {
      throw ApiError.badRequest(`Assignee must have one of the roles: ${roles.join(', ')}`);
    }
    await this.accessScope.assertCanAccess(
      actor,
      assignee._id,
      {},
      'You can only assign work to users within your team'
    );
    return assignee;
  }
}

module.exports = AssigneeService;
