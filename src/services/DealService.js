const ApiError = require('../utils/ApiError');
const { DEAL_STAGES, DEAL_STATUSES, ENTITY_TYPES, TIMELINE_ACTIONS, ROLES } = require('../constants');
const dealPolicy = require('../domain/dealPolicy');
const {
  searchCondition,
  equalsCondition,
  rangeCondition,
  combineConditions,
  buildSort,
  idOf,
} = require('../utils/queryHelpers');

const LIST_POPULATE = [
  { path: 'assignedTo', select: 'name email role' },
  { path: 'customer', select: 'name email company' },
];
const DETAIL_POPULATE = [
  ...LIST_POPULATE,
  { path: 'lead', select: 'name email status' },
  { path: 'createdBy', select: 'name email' },
];
const ACCESS_OPTIONS = { includeUnassigned: true };
const ACCESS_DENIED = 'You do not have access to this deal';

class DealService {
  constructor({
    dealRepository,
    customerRepository,
    accessScope,
    assigneeService,
    timelineService,
  }) {
    this.dealRepository = dealRepository;
    this.customerRepository = customerRepository;
    this.accessScope = accessScope;
    this.assigneeService = assigneeService;
    this.timelineService = timelineService;
  }

  async create(actor, dto) {
    const customer = await this.customerRepository.findById(dto.customerId);
    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }
    await this.accessScope.assertCanAccess(
      actor,
      customer.assignedTo,
      ACCESS_OPTIONS,
      'You do not have access to this customer'
    );

    const assignedTo =
      (await this.assigneeService.resolveOwner(actor, dto.assignedTo)) || customer.assignedTo;
    if (!assignedTo) {
      throw ApiError.badRequest('A deal must be assigned to a sales executive');
    }

    dealPolicy.assertClosingDateAllowed(dto.expectedClosingDate);
    const probability =
      dto.probability ?? dealPolicy.defaultProbabilityFor(DEAL_STAGES.QUALIFICATION);

    const deal = await this.dealRepository.create({
      name: dto.name,
      lead: customer.lead,
      customer: customer._id,
      assignedTo,
      value: dto.value,
      probability,
      expectedRevenue: dealPolicy.calculateExpectedRevenue(dto.value, probability),
      expectedClosingDate: dto.expectedClosingDate,
      stage: DEAL_STAGES.QUALIFICATION,
      description: dto.description,
      createdBy: actor._id,
    });

    await this.timelineService.record({
      action: TIMELINE_ACTIONS.DEAL_CREATED,
      entityType: ENTITY_TYPES.DEAL,
      entityId: deal._id,
      performedBy: actor._id,
      newValue: { name: deal.name, value: deal.value, stage: deal.stage },
      metadata: { customerId: customer._id },
    });
    return deal;
  }

  async list(actor, query) {
    const filter = combineConditions(
      await this.accessScope.ownershipFilter(actor, ACCESS_OPTIONS),
      searchCondition(['name', 'description'], query.search),
      equalsCondition('stage', query.stage),
      this.#statusCondition(query.status),
      equalsCondition('assignedTo', query.assignedTo),
      equalsCondition('customer', query.customer),
      rangeCondition('value', query.minAmount, query.maxAmount),
      rangeCondition('expectedClosingDate', query.closingFrom, query.closingTo),
      rangeCondition('createdAt', query.createdFrom, query.createdTo)
    );
    return this.dealRepository.paginate(filter, {
      page: query.page,
      limit: query.limit,
      sort: buildSort(query.sortBy, query.order),
      populate: LIST_POPULATE,
    });
  }

  getById(actor, id) {
    return this.#getAccessible(actor, id, DETAIL_POPULATE);
  }

  async update(actor, id, dto) {
    const deal = await this.#getAccessible(actor, id);
    dealPolicy.assertEditable(deal);

    const changes = { ...dto };
    if (
      dto.expectedClosingDate &&
      dto.expectedClosingDate.getTime() !== deal.expectedClosingDate.getTime()
    ) {
      dealPolicy.assertClosingDateAllowed(dto.expectedClosingDate);
    }
    if (dto.value !== undefined || dto.probability !== undefined) {
      const value = dto.value ?? deal.value;
      const probability = dto.probability ?? deal.probability;
      changes.expectedRevenue = dealPolicy.calculateExpectedRevenue(value, probability);
    }

    return this.dealRepository.updateById(id, changes, { populate: DETAIL_POPULATE });
  }

  async changeStage(actor, id, dto) {
    const deal = await this.#getAccessible(actor, id);
    dealPolicy.assertStageTransition(deal.stage, dto.stage);

    const changes = { stage: dto.stage };
    let action = TIMELINE_ACTIONS.DEAL_STAGE_CHANGED;
    const newValue = { stage: dto.stage };

    if (dto.stage === DEAL_STAGES.WON) {
      dealPolicy.assertCanBeWon(deal);
      Object.assign(changes, {
        probability: 100,
        expectedRevenue: deal.value,
        closedAt: new Date(),
      });
      action = TIMELINE_ACTIONS.DEAL_WON;
    } else if (dto.stage === DEAL_STAGES.LOST) {
      dealPolicy.assertLostReason(dto.lostReason);
      Object.assign(changes, {
        probability: 0,
        expectedRevenue: 0,
        lostReason: dto.lostReason.trim(),
        closedAt: new Date(),
      });
      newValue.lostReason = changes.lostReason;
      action = TIMELINE_ACTIONS.DEAL_LOST;
    } else {
      const probability = dto.probability ?? dealPolicy.defaultProbabilityFor(dto.stage);
      changes.probability = probability;
      changes.expectedRevenue = dealPolicy.calculateExpectedRevenue(deal.value, probability);
    }

    const updated = await this.dealRepository.updateById(id, changes, { populate: DETAIL_POPULATE });
    await this.timelineService.record({
      action,
      entityType: ENTITY_TYPES.DEAL,
      entityId: deal._id,
      performedBy: actor._id,
      previousValue: { stage: deal.stage },
      newValue,
    });
    return updated;
  }

  async assign(actor, id, { assignedTo }) {
    const deal = await this.#getAccessible(actor, id, LIST_POPULATE);
    dealPolicy.assertEditable(deal);
    if (deal.assignedTo && String(deal.assignedTo._id) === String(assignedTo)) {
      throw ApiError.badRequest('Deal is already assigned to this user');
    }
    const assignee = await this.assigneeService.assertAssignable(actor, assignedTo);

    const updated = await this.dealRepository.updateById(
      id,
      { assignedTo: assignee._id },
      { populate: DETAIL_POPULATE }
    );
    await this.timelineService.record({
      action: TIMELINE_ACTIONS.DEAL_ASSIGNED,
      entityType: ENTITY_TYPES.DEAL,
      entityId: deal._id,
      performedBy: actor._id,
      previousValue: deal.assignedTo ? { id: deal.assignedTo._id, name: deal.assignedTo.name } : null,
      newValue: { id: assignee._id, name: assignee.name },
    });
    return updated;
  }

  async remove(actor, id) {
    const deal = await this.#getAccessible(actor, id);
    if (actor.role !== ROLES.ADMIN && dealPolicy.isClosed(deal.stage)) {
      throw ApiError.forbidden('Only admins can delete closed deals');
    }
    await this.dealRepository.deleteById(id);
  }

  async getTimeline(actor, id, query) {
    await this.#getAccessible(actor, id);
    return this.timelineService.listForEntity(ENTITY_TYPES.DEAL, id, query);
  }

  #statusCondition(status) {
    switch (status) {
      case DEAL_STATUSES.OPEN:
        return { stage: { $in: dealPolicy.ACTIVE_STAGES } };
      case DEAL_STATUSES.WON:
        return { stage: DEAL_STAGES.WON };
      case DEAL_STATUSES.LOST:
        return { stage: DEAL_STAGES.LOST };
      default:
        return {};
    }
  }

  async #getAccessible(actor, id, populate) {
    const deal = await this.dealRepository.findById(id, { populate });
    if (!deal) {
      throw ApiError.notFound('Deal not found');
    }
    await this.accessScope.assertCanAccess(actor, idOf(deal.assignedTo), ACCESS_OPTIONS, ACCESS_DENIED);
    return deal;
  }
}

module.exports = DealService;
