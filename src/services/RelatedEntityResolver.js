const ApiError = require('../utils/ApiError');
const { ENTITY_TYPES } = require('../constants');

class RelatedEntityResolver {
  constructor({ leadRepository, customerRepository, dealRepository, userRepository, accessScope }) {
    this.accessScope = accessScope;
    this.strategies = {
      [ENTITY_TYPES.LEAD]: {
        repository: leadRepository,
        ownerField: 'assignedTo',
        label: 'Lead',
        includeUnassigned: true,
      },
      [ENTITY_TYPES.CUSTOMER]: {
        repository: customerRepository,
        ownerField: 'assignedTo',
        label: 'Customer',
        includeUnassigned: true,
      },
      [ENTITY_TYPES.DEAL]: {
        repository: dealRepository,
        ownerField: 'assignedTo',
        label: 'Deal',
        includeUnassigned: true,
      },
      [ENTITY_TYPES.USER]: {
        repository: userRepository,
        ownerField: '_id',
        label: 'User',
        includeUnassigned: false,
      },
    };
  }

  async assertAccessible(actor, type, id) {
    const strategy = this.strategies[type];
    const entity = await strategy.repository.findById(id, { select: strategy.ownerField });
    if (!entity) {
      throw ApiError.notFound(`${strategy.label} not found`);
    }
    await this.accessScope.assertCanAccess(
      actor,
      entity[strategy.ownerField],
      { includeUnassigned: strategy.includeUnassigned },
      `You do not have access to this ${strategy.label.toLowerCase()}`
    );
  }
}

module.exports = RelatedEntityResolver;
