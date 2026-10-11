const ApiError = require('../utils/ApiError');
const { ROLES, ENTITY_TYPES, TIMELINE_ACTIONS } = require('../constants');
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
  { path: 'lead', select: 'name email status' },
];
const ACCESS_OPTIONS = { includeUnassigned: true };
const ACCESS_DENIED = 'You do not have access to this customer';

class CustomerService {
  constructor({
    customerRepository,
    dealRepository,
    accessScope,
    assigneeService,
    timelineService,
  }) {
    this.customerRepository = customerRepository;
    this.dealRepository = dealRepository;
    this.accessScope = accessScope;
    this.assigneeService = assigneeService;
    this.timelineService = timelineService;
  }

  async create(actor, dto) {
    await this.#assertEmailAvailable(dto.email);
    const assignedTo = await this.assigneeService.resolveOwner(actor, dto.assignedTo);

    const customer = await this.customerRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      company: dto.company,
      address: dto.address,
      status: dto.status,
      assignedTo,
      createdBy: actor._id,
    });

    await this.timelineService.record({
      action: TIMELINE_ACTIONS.CUSTOMER_CREATED,
      entityType: ENTITY_TYPES.CUSTOMER,
      entityId: customer._id,
      performedBy: actor._id,
      newValue: { name: customer.name, email: customer.email },
    });
    return customer;
  }

  async list(actor, query) {
    const filter = combineConditions(
      await this.accessScope.ownershipFilter(actor, ACCESS_OPTIONS),
      searchCondition(['name', 'email', 'phone', 'company'], query.search),
      equalsCondition('status', query.status),
      equalsCondition('assignedTo', query.assignedTo),
      rangeCondition('createdAt', query.createdFrom, query.createdTo)
    );
    return this.customerRepository.paginate(filter, {
      page: query.page,
      limit: query.limit,
      sort: buildSort(query.sortBy, query.order),
      populate: LIST_POPULATE,
    });
  }

  async getById(actor, id) {
    const customer = await this.#getAccessible(actor, id, DETAIL_POPULATE);
    const deals = await this.dealRepository.findMany(
      { customer: customer._id },
      {
        sort: { createdAt: -1 },
        select: 'name stage value probability expectedRevenue expectedClosingDate assignedTo',
      }
    );
    return { ...customer, deals };
  }

  async update(actor, id, dto) {
    const customer = await this.#getAccessible(actor, id);

    if (dto.email && dto.email !== customer.email) {
      await this.#assertEmailAvailable(dto.email);
    }

    const changes = { ...dto };
    let newAssignee = null;
    if (dto.assignedTo !== undefined) {
      if (actor.role === ROLES.SALES_EXECUTIVE) {
        throw ApiError.forbidden('Only managers and admins can reassign customers');
      }
      newAssignee = await this.assigneeService.assertAssignable(actor, dto.assignedTo);
      changes.assignedTo = newAssignee._id;
    }

    const updated = await this.customerRepository.updateById(id, changes, {
      populate: DETAIL_POPULATE,
    });

    if (newAssignee && String(newAssignee._id) !== String(customer.assignedTo)) {
      await this.timelineService.record({
        action: TIMELINE_ACTIONS.CUSTOMER_ASSIGNED,
        entityType: ENTITY_TYPES.CUSTOMER,
        entityId: customer._id,
        performedBy: actor._id,
        previousValue: customer.assignedTo ? { id: customer.assignedTo } : null,
        newValue: { id: newAssignee._id, name: newAssignee.name },
      });
    }
    return updated;
  }

  async remove(actor, id) {
    const customer = await this.#getAccessible(actor, id);
    if (await this.dealRepository.exists({ customer: customer._id })) {
      throw ApiError.conflict('Customer has deals and cannot be deleted');
    }
    await this.customerRepository.deleteById(id);
  }

  async getTimeline(actor, id, query) {
    await this.#getAccessible(actor, id);
    return this.timelineService.listForEntity(ENTITY_TYPES.CUSTOMER, id, query);
  }

  async #getAccessible(actor, id, populate) {
    const customer = await this.customerRepository.findById(id, { populate });
    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }
    await this.accessScope.assertCanAccess(
      actor,
      idOf(customer.assignedTo),
      ACCESS_OPTIONS,
      ACCESS_DENIED
    );
    return customer;
  }

  async #assertEmailAvailable(email) {
    if (await this.customerRepository.findByEmail(email)) {
      throw ApiError.conflict('A customer with this email already exists');
    }
  }
}

module.exports = CustomerService;
