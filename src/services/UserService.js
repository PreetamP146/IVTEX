const ApiError = require('../utils/ApiError');
const { ROLES } = require('../constants');
const { searchCondition, equalsCondition, combineConditions, buildSort } = require('../utils/queryHelpers');

class UserService {
  constructor({ userRepository, passwordHasher, userOwnershipService }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.userOwnershipService = userOwnershipService;
  }

  async create(dto) {
    await this.#assertEmailAvailable(dto.email);
    await this.#assertValidManager(dto.role, dto.managerId);
    return this.userRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      password: await this.passwordHasher.hash(dto.password),
      role: dto.role,
      isActive: dto.isActive,
      manager: dto.role === ROLES.SALES_EXECUTIVE ? dto.managerId : undefined,
    });
  }

  list(query) {
    return this.#paginate(
      combineConditions(
        searchCondition(['name', 'email'], query.search),
        equalsCondition('role', query.role),
        equalsCondition('isActive', query.isActive),
        equalsCondition('manager', query.manager)
      ),
      query
    );
  }

  listTeam(actor, query) {
    const scope =
      actor.role === ROLES.SALES_MANAGER
        ? { manager: actor._id, role: ROLES.SALES_EXECUTIVE }
        : { role: ROLES.SALES_EXECUTIVE };
    return this.#paginate(
      combineConditions(
        scope,
        searchCondition(['name', 'email'], query.search),
        equalsCondition('isActive', query.isActive)
      ),
      query
    );
  }

  async getById(id) {
    const user = await this.userRepository.findById(id, {
      populate: [{ path: 'manager', select: 'name email' }],
    });
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async update(actor, id, dto) {
    const existing = await this.#findOrFail(id);
    const role = dto.role || existing.role;

    if (dto.email && dto.email !== existing.email) {
      await this.#assertEmailAvailable(dto.email);
    }
    if (dto.role && dto.role !== existing.role) {
      await this.#assertRoleChangeAllowed(actor, existing, dto.role);
    }

    const changes = {};
    for (const field of ['name', 'email', 'phone']) {
      if (dto[field] !== undefined) {
        changes[field] = dto[field];
      }
    }
    if (dto.role) {
      changes.role = dto.role;
    }
    if (dto.password) {
      changes.password = await this.passwordHasher.hash(dto.password);
    }

    if (role !== ROLES.SALES_EXECUTIVE) {
      changes.manager = null;
    } else if (dto.managerId !== undefined) {
      await this.#assertValidManager(role, dto.managerId);
      changes.manager = dto.managerId;
    }

    const updated = await this.userRepository.updateById(id, changes);
    if (dto.password) {
      await this.userRepository.clearRefreshToken(id);
    }
    return updated;
  }

  async setActive(actor, id, isActive) {
    await this.#findOrFail(id);
    if (String(actor._id) === String(id) && !isActive) {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }
    const updated = await this.userRepository.updateById(id, { isActive });
    if (!isActive) {
      await this.userRepository.clearRefreshToken(id);
    }
    return updated;
  }

  async remove(actor, id) {
    const user = await this.#findOrFail(id);
    if (String(actor._id) === String(id)) {
      throw ApiError.badRequest('You cannot delete your own account');
    }
    if (user.role === ROLES.SALES_MANAGER) {
      const teamIds = await this.userRepository.findTeamMemberIds(user._id);
      if (teamIds.length > 0) {
        throw ApiError.conflict('Reassign this manager\'s team before deleting the account');
      }
    }
    if (await this.userOwnershipService.hasLinkedRecords(user._id)) {
      throw ApiError.conflict(
        'User has assigned leads, customers, deals or activities. Deactivate the user instead'
      );
    }
    await this.userRepository.deleteById(id);
  }

  #paginate(filter, query) {
    return this.userRepository.paginate(filter, {
      page: query.page,
      limit: query.limit,
      sort: buildSort(query.sortBy, query.order),
      populate: [{ path: 'manager', select: 'name email' }],
    });
  }

  async #findOrFail(id) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async #assertEmailAvailable(email) {
    if (await this.userRepository.findByEmail(email)) {
      throw ApiError.conflict('A user with this email already exists');
    }
  }

  async #assertValidManager(role, managerId) {
    if (!managerId) {
      return;
    }
    if (role !== ROLES.SALES_EXECUTIVE) {
      throw ApiError.badRequest('Only sales executives can be linked to a manager');
    }
    const manager = await this.userRepository.findById(managerId);
    if (!manager || manager.role !== ROLES.SALES_MANAGER || !manager.isActive) {
      throw ApiError.badRequest('Manager must be an active sales manager');
    }
  }

  async #assertRoleChangeAllowed(actor, existing, newRole) {
    if (String(actor._id) === String(existing._id)) {
      throw ApiError.badRequest('You cannot change your own role');
    }
    if (existing.role === ROLES.SALES_MANAGER) {
      const teamIds = await this.userRepository.findTeamMemberIds(existing._id);
      if (teamIds.length > 0) {
        throw ApiError.conflict('Reassign this manager\'s team before changing the role');
      }
    }
    const leavingExecutiveRole =
      existing.role === ROLES.SALES_EXECUTIVE && newRole !== ROLES.SALES_EXECUTIVE;
    if (leavingExecutiveRole && (await this.userOwnershipService.hasLinkedRecords(existing._id))) {
      throw ApiError.conflict('Reassign this executive\'s records before changing the role');
    }
  }
}

module.exports = UserService;
