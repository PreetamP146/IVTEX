const BaseRepository = require('./BaseRepository');
const Deal = require('../models/Deal');
const { DEAL_STAGES } = require('../constants');

class DealRepository extends BaseRepository {
  constructor() {
    super(Deal);
  }

  summarizeByStage(filter) {
    return this.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          expectedRevenue: { $sum: '$expectedRevenue' },
        },
      },
    ]);
  }

  performanceByAssignee(userIds) {
    const isWon = { $eq: ['$stage', DEAL_STAGES.WON] };
    const isLost = { $eq: ['$stage', DEAL_STAGES.LOST] };
    return this.aggregate([
      { $match: { assignedTo: { $in: userIds } } },
      {
        $group: {
          _id: '$assignedTo',
          totalDeals: { $sum: 1 },
          wonDeals: { $sum: { $cond: [isWon, 1, 0] } },
          lostDeals: { $sum: { $cond: [isLost, 1, 0] } },
          revenue: { $sum: { $cond: [isWon, '$value', 0] } },
          pipelineValue: {
            $sum: { $cond: [{ $or: [isWon, isLost] }, 0, '$expectedRevenue'] },
          },
        },
      },
    ]);
  }
}

module.exports = DealRepository;
