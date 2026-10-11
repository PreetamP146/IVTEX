const ApiError = require('../utils/ApiError');
const { ROLES } = require('../constants');

class AccessScopeService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async visibleUserIds(actor) {
    if (actor.role === ROLES.ADMIN) {
      return null;
    }
    if (actor.role === ROLES.SALES_MANAGER) {
      const teamIds = await this.userRepository.findTeamMemberIds(actor._id);
      return [actor._id, ...teamIds];
    }
    return [actor._id];
  }

  async ownershipFilter(actor, { field = 'assignedTo', includeUnassigned = false } = {}) {
    const ids = await this.visibleUserIds(actor);
    if (!ids) {
      return {};
    }
    const owned = { [field]: { $in: ids } };
    if (includeUnassigned && actor.role === ROLES.SALES_MANAGER) {
      return { $or: [owned, { [field]: null }] };
    }
    return owned;
  }

  async canAccess(actor, ownerId, { includeUnassigned = false } = {}) {
    const ids = await this.visibleUserIds(actor);
    if (!ids) {
      return true;
    }
    if (!ownerId) {
      return includeUnassigned && actor.role === ROLES.SALES_MANAGER;
    }
    return ids.some((id) => id.equals(ownerId));
  }

  async assertCanAccess(actor, ownerId, options, message) {
    if (!(await this.canAccess(actor, ownerId, options))) {
      throw ApiError.forbidden(message);
    }
  }
}

module.exports = AccessScopeService;
