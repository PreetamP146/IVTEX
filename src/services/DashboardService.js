const { LEAD_STATUSES, DEAL_STAGES, DEAL_STAGE_LIST, ROLES } = require('../constants');
const { ACTIVE_STAGES } = require('../domain/dealPolicy');

const roundTwo = (value) => Math.round(value * 100) / 100;
const percentage = (part, whole) => (whole === 0 ? 0 : roundTwo((part / whole) * 100));

class DashboardService {
  constructor({
    leadRepository,
    customerRepository,
    dealRepository,
    activityRepository,
    userRepository,
    accessScope,
  }) {
    this.leadRepository = leadRepository;
    this.customerRepository = customerRepository;
    this.dealRepository = dealRepository;
    this.activityRepository = activityRepository;
    this.userRepository = userRepository;
    this.accessScope = accessScope;
  }

  async getStats(actor) {
    const [ownedWithUnassigned, owned] = await Promise.all([
      this.accessScope.ownershipFilter(actor, { includeUnassigned: true }),
      this.accessScope.ownershipFilter(actor),
    ]);

    const [leadRows, totalCustomers, stageRows, activityCounts] = await Promise.all([
      this.leadRepository.countByStatus(ownedWithUnassigned),
      this.customerRepository.count(ownedWithUnassigned),
      this.dealRepository.summarizeByStage(ownedWithUnassigned),
      this.activityRepository.countPendingAndOverdue(owned, new Date()),
    ]);

    const leadCounts = Object.fromEntries(leadRows.map((row) => [row._id, row.count]));
    const totalLeads = leadRows.reduce((sum, row) => sum + row.count, 0);
    const convertedLeads = leadCounts[LEAD_STATUSES.CONVERTED] || 0;

    const stages = this.#indexByStage(stageRows);
    const openStages = ACTIVE_STAGES.map((stage) => stages[stage]);

    return {
      leads: {
        total: totalLeads,
        new: leadCounts[LEAD_STATUSES.NEW] || 0,
        qualified: leadCounts[LEAD_STATUSES.QUALIFIED] || 0,
        converted: convertedLeads,
        conversionRate: percentage(convertedLeads, totalLeads),
      },
      customers: { total: totalCustomers },
      deals: {
        total: DEAL_STAGE_LIST.reduce((sum, stage) => sum + stages[stage].count, 0),
        open: openStages.reduce((sum, row) => sum + row.count, 0),
        won: stages[DEAL_STAGES.WON].count,
        lost: stages[DEAL_STAGES.LOST].count,
        totalRevenue: stages[DEAL_STAGES.WON].totalValue,
        expectedRevenue: roundTwo(openStages.reduce((sum, row) => sum + row.expectedRevenue, 0)),
      },
      activities: activityCounts,
    };
  }

  async getPipeline(actor) {
    const filter = await this.accessScope.ownershipFilter(actor, { includeUnassigned: true });
    const stages = this.#indexByStage(await this.dealRepository.summarizeByStage(filter));
    return DEAL_STAGE_LIST.map((stage) => ({ stage, ...stages[stage] }));
  }

  async getTeamPerformance(actor) {
    const teamFilter =
      actor.role === ROLES.SALES_MANAGER
        ? { manager: actor._id, role: ROLES.SALES_EXECUTIVE }
        : { role: ROLES.SALES_EXECUTIVE };
    const members = await this.userRepository.findMany(teamFilter, {
      select: 'name email isActive',
      sort: { name: 1 },
    });
    const memberIds = members.map((member) => member._id);

    const [leadRows, dealRows, activityRows] = await Promise.all([
      this.leadRepository.performanceByAssignee(memberIds),
      this.dealRepository.performanceByAssignee(memberIds),
      this.activityRepository.performanceByAssignee(memberIds, new Date()),
    ]);
    const leadsByUser = this.#indexByUser(leadRows);
    const dealsByUser = this.#indexByUser(dealRows);
    const activitiesByUser = this.#indexByUser(activityRows);

    return members.map((member) => {
      const key = String(member._id);
      const leads = leadsByUser[key] || { totalLeads: 0, convertedLeads: 0 };
      const deals = dealsByUser[key] || {
        totalDeals: 0,
        wonDeals: 0,
        lostDeals: 0,
        revenue: 0,
        pipelineValue: 0,
      };
      const activities = activitiesByUser[key] || {
        completedActivities: 0,
        pendingActivities: 0,
        overdueActivities: 0,
      };
      return {
        user: member,
        leads: {
          total: leads.totalLeads,
          converted: leads.convertedLeads,
          conversionRate: percentage(leads.convertedLeads, leads.totalLeads),
        },
        deals: {
          total: deals.totalDeals,
          won: deals.wonDeals,
          lost: deals.lostDeals,
          revenue: deals.revenue,
          pipelineValue: roundTwo(deals.pipelineValue),
        },
        activities: {
          completed: activities.completedActivities,
          pending: activities.pendingActivities,
          overdue: activities.overdueActivities,
        },
      };
    });
  }

  #indexByStage(rows) {
    const indexed = Object.fromEntries(
      DEAL_STAGE_LIST.map((stage) => [stage, { count: 0, totalValue: 0, expectedRevenue: 0 }])
    );
    rows.forEach((row) => {
      indexed[row._id] = {
        count: row.count,
        totalValue: row.totalValue,
        expectedRevenue: row.expectedRevenue,
      };
    });
    return indexed;
  }

  #indexByUser(rows) {
    return Object.fromEntries(rows.map((row) => [String(row._id), row]));
  }
}

module.exports = DashboardService;
