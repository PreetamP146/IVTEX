const { buildSort } = require('../utils/queryHelpers');

class TimelineService {
  constructor(timelineRepository) {
    this.timelineRepository = timelineRepository;
  }

  record(entry, options) {
    return this.timelineRepository.create(entry, options);
  }

  recordMany(entries, options) {
    return this.timelineRepository.createMany(entries, options);
  }

  listForEntity(entityType, entityId, { page, limit, order }) {
    return this.timelineRepository.paginate(
      { entityType, entityId },
      {
        page,
        limit,
        sort: buildSort('createdAt', order),
        populate: [{ path: 'performedBy', select: 'name email role' }],
      }
    );
  }
}

module.exports = TimelineService;
