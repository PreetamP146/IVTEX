const BaseRepository = require('./BaseRepository');
const Lead = require('../models/Lead');
const { LEAD_STATUSES } = require('../constants');

class LeadRepository extends BaseRepository {
  constructor() {
    super(Lead);
  }

  claimForConversion(id, { session }) {
    return this.model
      .findOneAndUpdate(
        { _id: id, status: LEAD_STATUSES.QUALIFIED },
        { $set: { status: LEAD_STATUSES.CONVERTED, convertedAt: new Date() } },
        { new: true, session }
      )
      .lean();
  }

  countByStatus(filter) {
    return this.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }

  performanceByAssignee(userIds) {
    return this.aggregate([
      { $match: { assignedTo: { $in: userIds } } },
      {
        $group: {
          _id: '$assignedTo',
          totalLeads: { $sum: 1 },
          convertedLeads: {
            $sum: { $cond: [{ $eq: ['$status', LEAD_STATUSES.CONVERTED] }, 1, 0] },
          },
        },
      },
    ]);
  }
}

module.exports = LeadRepository;
