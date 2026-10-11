const ApiError = require('../utils/ApiError');
const {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  ENTITY_TYPES,
  ROLE_LIST,
  ROLES,
  TIMELINE_ACTIONS,
} = require('../constants');
const {
  searchCondition,
  equalsCondition,
  rangeCondition,
  combineConditions,
  buildSort,
  idOf,
} = require('../utils/queryHelpers');

const POPULATE = [
  { path: 'assignedTo', select: 'name email role' },
  { path: 'createdBy', select: 'name email' },
];
const TIMELINE_ENTITIES = [ENTITY_TYPES.LEAD, ENTITY_TYPES.CUSTOMER, ENTITY_TYPES.DEAL];

const toPlain = (document) => (typeof document.toObject === 'function' ? document.toObject() : document);

class ActivityService {
  constructor({
    activityRepository,
    accessScope,
    assigneeService,
    relatedEntityResolver,
    timelineService,
  }) {
    this.activityRepository = activityRepository;
    this.accessScope = accessScope;
    this.assigneeService = assigneeService;
    this.relatedEntityResolver = relatedEntityResolver;
    this.timelineService = timelineService;
  }

  async create(actor, dto) {
    if (dto.relatedType) {
      await this.relatedEntityResolver.assertAccessible(actor, dto.relatedType, dto.relatedId);
    }
    const assignedTo = dto.assignedTo
      ? (await this.assigneeService.assertAssignable(actor, dto.assignedTo, { roles: ROLE_LIST }))._id
      : actor._id;

    const activity = await this.activityRepository.create({
      type: dto.type,
      title: dto.title,
      description: dto.description,
      assignedTo,
      dueDate: dto.dueDate || new Date(),
      relatedType: dto.relatedType,
      relatedId: dto.relatedId,
      createdBy: actor._id,
    });

    await this.#recordCreation(actor, activity);
    return this.#present(toPlain(activity));
  }

  async list(actor, query) {
    const now = new Date();
    const filter = combineConditions(
      await this.#scopeFilter(actor),
      searchCondition(['title', 'description'], query.search),
      equalsCondition('type', query.type),
      this.#statusCondition(query.status, now),
      equalsCondition('assignedTo', query.assignedTo),
      equalsCondition('relatedType', query.relatedType),
      equalsCondition('relatedId', query.relatedId),
      rangeCondition('dueDate', query.dueFrom, query.dueTo)
    );
    const result = await this.activityRepository.paginate(filter, {
      page: query.page,
      limit: query.limit,
      sort: buildSort(query.sortBy, query.order),
      populate: POPULATE,
    });
    return { ...result, items: result.items.map((item) => this.#present(item, now)) };
  }

  async getById(actor, id) {
    const activity = await this.#getAccessible(actor, id, POPULATE);
    return this.#present(activity);
  }

  async update(actor, id, dto) {
    const activity = await this.#getAccessible(actor, id);
    this.#assertPending(activity);

    const changes = { ...dto };
    if (dto.assignedTo) {
      const assignee = await this.assigneeService.assertAssignable(actor, dto.assignedTo, {
        roles: ROLE_LIST,
      });
      changes.assignedTo = assignee._id;
    }
    const updated = await this.activityRepository.updateById(id, changes, { populate: POPULATE });
    return this.#present(updated);
  }

  async complete(actor, id) {
    const activity = await this.#getAccessible(actor, id);
    this.#assertPending(activity);

    const completed = await this.activityRepository.updateById(
      id,
      { status: ACTIVITY_STATUSES.COMPLETED, completedAt: new Date() },
      { populate: POPULATE }
    );

    if (TIMELINE_ENTITIES.includes(activity.relatedType)) {
      await this.timelineService.record({
        action:
          activity.type === ACTIVITY_TYPES.FOLLOW_UP
            ? TIMELINE_ACTIONS.FOLLOW_UP_COMPLETED
            : TIMELINE_ACTIONS.ACTIVITY_COMPLETED,
        entityType: activity.relatedType,
        entityId: activity.relatedId,
        performedBy: actor._id,
        newValue: { activityId: activity._id, type: activity.type, title: activity.title },
      });
    }
    return this.#present(completed);
  }

  async remove(actor, id) {
    const activity = await this.#getAccessible(actor, id);
    const isCreator = String(activity.createdBy) === String(actor._id);
    if (actor.role === ROLES.SALES_EXECUTIVE && !isCreator) {
      throw ApiError.forbidden('You can only delete activities you created');
    }
    await this.activityRepository.deleteById(id);
  }

  #present(activity, now = new Date()) {
    return { ...activity, status: this.#effectiveStatus(activity, now) };
  }

  #effectiveStatus(activity, now) {
    if (activity.status === ACTIVITY_STATUSES.PENDING && activity.dueDate < now) {
      return ACTIVITY_STATUSES.OVERDUE;
    }
    return activity.status;
  }

  #statusCondition(status, now) {
    switch (status) {
      case ACTIVITY_STATUSES.PENDING:
        return { status: ACTIVITY_STATUSES.PENDING, dueDate: { $gte: now } };
      case ACTIVITY_STATUSES.OVERDUE:
        return { status: ACTIVITY_STATUSES.PENDING, dueDate: { $lt: now } };
      case ACTIVITY_STATUSES.COMPLETED:
        return { status: ACTIVITY_STATUSES.COMPLETED };
      default:
        return {};
    }
  }

  async #scopeFilter(actor) {
    const ids = await this.accessScope.visibleUserIds(actor);
    if (!ids) {
      return {};
    }
    return { $or: [{ assignedTo: { $in: ids } }, { createdBy: { $in: ids } }] };
  }

  async #getAccessible(actor, id, populate) {
    const activity = await this.activityRepository.findById(id, { populate });
    if (!activity) {
      throw ApiError.notFound('Activity not found');
    }
    const ids = await this.accessScope.visibleUserIds(actor);
    const allowed =
      !ids ||
      ids.some(
        (userId) => userId.equals(idOf(activity.assignedTo)) || userId.equals(idOf(activity.createdBy))
      );
    if (!allowed) {
      throw ApiError.forbidden('You do not have access to this activity');
    }
    return activity;
  }

  #assertPending(activity) {
    if (activity.status === ACTIVITY_STATUSES.COMPLETED) {
      throw ApiError.conflict('A completed activity can no longer be changed');
    }
  }

  async #recordCreation(actor, activity) {
    if (!TIMELINE_ENTITIES.includes(activity.relatedType)) {
      return;
    }
    const actions = {
      [ACTIVITY_TYPES.NOTE]: TIMELINE_ACTIONS.NOTE_ADDED,
      [ACTIVITY_TYPES.FOLLOW_UP]: TIMELINE_ACTIONS.FOLLOW_UP_CREATED,
    };
    await this.timelineService.record({
      action: actions[activity.type] || TIMELINE_ACTIONS.ACTIVITY_CREATED,
      entityType: activity.relatedType,
      entityId: activity.relatedId,
      performedBy: actor._id,
      newValue: {
        activityId: activity._id,
        type: activity.type,
        title: activity.title,
        dueDate: activity.dueDate,
      },
    });
  }
}

module.exports = ActivityService;
