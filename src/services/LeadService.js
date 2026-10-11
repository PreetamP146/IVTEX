const ApiError = require('../utils/ApiError');
const { LEAD_STATUSES, ENTITY_TYPES, TIMELINE_ACTIONS } = require('../constants');
const { assertStatusTransition } = require('../domain/leadWorkflow');
const {
  searchCondition,
  equalsCondition,
  rangeCondition,
  combineConditions,
  buildSort,
  idOf,
} = require('../utils/queryHelpers');

const LIST_POPULATE = [{ path: 'assignedTo', select: 'name email role' }];
const DETAIL_POPULATE = [
  { path: 'assignedTo', select: 'name email role' },
  { path: 'createdBy', select: 'name email' },
  { path: 'customer', select: 'name email' },
  { path: 'deal', select: 'name stage value' },
];
const ACCESS_OPTIONS = { includeUnassigned: true };
const ACCESS_DENIED = 'You do not have access to this lead';

class LeadService {
  constructor({ leadRepository, accessScope, assigneeService, timelineService }) {
    this.leadRepository = leadRepository;
    this.accessScope = accessScope;
    this.assigneeService = assigneeService;
    this.timelineService = timelineService;
  }

  async create(actor, dto) {
    const assignedTo = await this.assigneeService.resolveOwner(actor, dto.assignedTo);
    const lead = await this.leadRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
      source: dto.source,
      priority: dto.priority,
      description: dto.description,
      assignedTo,
      createdBy: actor._id,
    });

    const entries = [
      {
        action: TIMELINE_ACTIONS.LEAD_CREATED,
        entityType: ENTITY_TYPES.LEAD,
        entityId: lead._id,
        performedBy: actor._id,
        newValue: { status: lead.status, priority: lead.priority, source: lead.source },
      },
    ];
    if (assignedTo && String(assignedTo) !== String(actor._id)) {
      entries.push({
        action: TIMELINE_ACTIONS.LEAD_ASSIGNED,
        entityType: ENTITY_TYPES.LEAD,
        entityId: lead._id,
        performedBy: actor._id,
        newValue: { id: assignedTo },
      });
    }
    await this.timelineService.recordMany(entries);
    return lead;
  }

  async list(actor, query) {
    const filter = combineConditions(
      await this.accessScope.ownershipFilter(actor, ACCESS_OPTIONS),
      searchCondition(['name', 'email', 'phone', 'company'], query.search),
      equalsCondition('status', query.status),
      equalsCondition('priority', query.priority),
      equalsCondition('source', query.source),
      equalsCondition('assignedTo', query.assignedTo),
      rangeCondition('createdAt', query.createdFrom, query.createdTo)
    );
    return this.leadRepository.paginate(filter, {
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
    const lead = await this.#getAccessible(actor, id);
    this.#assertNotConverted(lead);

    const updated = await this.leadRepository.updateById(id, dto, { populate: DETAIL_POPULATE });

    if (dto.priority && dto.priority !== lead.priority) {
      await this.timelineService.record({
        action: TIMELINE_ACTIONS.LEAD_PRIORITY_CHANGED,
        entityType: ENTITY_TYPES.LEAD,
        entityId: lead._id,
        performedBy: actor._id,
        previousValue: lead.priority,
        newValue: dto.priority,
      });
    }
    return updated;
  }

  async updateStatus(actor, id, { status }) {
    const lead = await this.#getAccessible(actor, id);
    assertStatusTransition(lead.status, status);

    const updated = await this.leadRepository.updateById(id, { status }, { populate: DETAIL_POPULATE });
    await this.timelineService.record({
      action: TIMELINE_ACTIONS.LEAD_STATUS_CHANGED,
      entityType: ENTITY_TYPES.LEAD,
      entityId: lead._id,
      performedBy: actor._id,
      previousValue: lead.status,
      newValue: status,
    });
    return updated;
  }

  async assign(actor, id, { assignedTo }) {
    const lead = await this.#getAccessible(actor, id, LIST_POPULATE);
    const currentAssignee = lead.assignedTo;
    if (currentAssignee && String(currentAssignee._id) === String(assignedTo)) {
      throw ApiError.badRequest('Lead is already assigned to this user');
    }
    const assignee = await this.assigneeService.assertAssignable(actor, assignedTo);

    const updated = await this.leadRepository.updateById(
      id,
      { assignedTo: assignee._id },
      { populate: DETAIL_POPULATE }
    );
    await this.timelineService.record({
      action: currentAssignee ? TIMELINE_ACTIONS.LEAD_REASSIGNED : TIMELINE_ACTIONS.LEAD_ASSIGNED,
      entityType: ENTITY_TYPES.LEAD,
      entityId: lead._id,
      performedBy: actor._id,
      previousValue: currentAssignee ? { id: currentAssignee._id, name: currentAssignee.name } : null,
      newValue: { id: assignee._id, name: assignee.name },
    });
    return updated;
  }

  async remove(actor, id) {
    const lead = await this.#getAccessible(actor, id);
    this.#assertNotConverted(lead);
    await this.leadRepository.deleteById(id);
  }

  async getTimeline(actor, id, query) {
    await this.#getAccessible(actor, id);
    return this.timelineService.listForEntity(ENTITY_TYPES.LEAD, id, query);
  }

  async #getAccessible(actor, id, populate) {
    const lead = await this.leadRepository.findById(id, { populate });
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }
    await this.accessScope.assertCanAccess(actor, idOf(lead.assignedTo), ACCESS_OPTIONS, ACCESS_DENIED);
    return lead;
  }

  #assertNotConverted(lead) {
    if (lead.status === LEAD_STATUSES.CONVERTED) {
      throw ApiError.conflict('A converted lead cannot be modified or deleted');
    }
  }
}

module.exports = LeadService;
