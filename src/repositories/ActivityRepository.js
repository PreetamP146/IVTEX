const BaseRepository = require('./BaseRepository');
const Activity = require('../models/Activity');
const { ACTIVITY_STATUSES } = require('../constants');

class ActivityRepository extends BaseRepository {
  constructor() {
    super(Activity);
  }

  async countPendingAndOverdue(filter, now) {
    const [result] = await this.aggregate([
      { $match: { ...filter, status: ACTIVITY_STATUSES.PENDING } },
      {
        $group: {
          _id: null,
          pending: { $sum: { $cond: [{ $gte: ['$dueDate', now] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $lt: ['$dueDate', now] }, 1, 0] } },
        },
      },
    ]);
    return { pending: result ? result.pending : 0, overdue: result ? result.overdue : 0 };
  }

  performanceByAssignee(userIds, now) {
    return this.aggregate([
      { $match: { assignedTo: { $in: userIds } } },
      {
        $group: {
          _id: '$assignedTo',
          completedActivities: {
            $sum: { $cond: [{ $eq: ['$status', ACTIVITY_STATUSES.COMPLETED] }, 1, 0] },
          },
          pendingActivities: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', ACTIVITY_STATUSES.PENDING] },
                    { $gte: ['$dueDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          overdueActivities: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', ACTIVITY_STATUSES.PENDING] },
                    { $lt: ['$dueDate', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);
  }
}

module.exports = ActivityRepository;
