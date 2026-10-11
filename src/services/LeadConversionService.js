const ApiError = require('../utils/ApiError');
const { DEAL_STAGES, ENTITY_TYPES, TIMELINE_ACTIONS, LEAD_STATUSES } = require('../constants');
const { assertConvertible } = require('../domain/leadWorkflow');
const dealPolicy = require('../domain/dealPolicy');

class LeadConversionService {
  constructor({
    leadRepository,
    customerRepository,
    dealRepository,
    accessScope,
    timelineService,
    transactionRunner,
  }) {
    this.leadRepository = leadRepository;
    this.customerRepository = customerRepository;
    this.dealRepository = dealRepository;
    this.accessScope = accessScope;
    this.timelineService = timelineService;
    this.transactionRunner = transactionRunner;
  }

  async convert(actor, leadId, dto) {
    const lead = await this.leadRepository.findById(leadId);
    if (!lead) {
      throw ApiError.notFound('Lead not found');
    }
    await this.accessScope.assertCanAccess(
      actor,
      lead.assignedTo,
      { includeUnassigned: true },
      'You do not have access to this lead'
    );
    assertConvertible(lead);

    if (!lead.assignedTo) {
      throw ApiError.badRequest('Assign the lead to a sales executive before converting it');
    }
    dealPolicy.assertClosingDateAllowed(dto.deal.expectedClosingDate);
    if (await this.customerRepository.findByEmail(lead.email)) {
      throw ApiError.conflict('A customer with this email already exists');
    }

    const probability =
      dto.deal.probability ?? dealPolicy.defaultProbabilityFor(DEAL_STAGES.QUALIFICATION);

    return this.transactionRunner.run(async (session) => {
      const claimedLead = await this.leadRepository.claimForConversion(lead._id, { session });
      if (!claimedLead) {
        throw ApiError.conflict('Lead has already been converted');
      }

      const customer = await this.customerRepository.create(
        {
          name: lead.name,
          email: lead.email,
          phone: dto.customer?.phone || lead.phone,
          company: dto.customer?.company || lead.company,
          address: dto.customer?.address,
          lead: lead._id,
          assignedTo: lead.assignedTo,
          createdBy: actor._id,
        },
        { session }
      );

      const deal = await this.dealRepository.create(
        {
          name: dto.deal.name,
          lead: lead._id,
          customer: customer._id,
          assignedTo: lead.assignedTo,
          value: dto.deal.value,
          probability,
          expectedRevenue: dealPolicy.calculateExpectedRevenue(dto.deal.value, probability),
          expectedClosingDate: dto.deal.expectedClosingDate,
          stage: DEAL_STAGES.QUALIFICATION,
          description: dto.deal.description,
          createdBy: actor._id,
        },
        { session }
      );

      const convertedLead = await this.leadRepository.updateById(
        lead._id,
        { customer: customer._id, deal: deal._id },
        { session }
      );

      await this.timelineService.recordMany(
        [
          {
            action: TIMELINE_ACTIONS.LEAD_CONVERTED,
            entityType: ENTITY_TYPES.LEAD,
            entityId: lead._id,
            performedBy: actor._id,
            previousValue: lead.status,
            newValue: LEAD_STATUSES.CONVERTED,
            metadata: { customerId: customer._id, dealId: deal._id },
          },
          {
            action: TIMELINE_ACTIONS.CUSTOMER_CREATED,
            entityType: ENTITY_TYPES.CUSTOMER,
            entityId: customer._id,
            performedBy: actor._id,
            newValue: { name: customer.name, email: customer.email },
            metadata: { leadId: lead._id },
          },
          {
            action: TIMELINE_ACTIONS.DEAL_CREATED,
            entityType: ENTITY_TYPES.DEAL,
            entityId: deal._id,
            performedBy: actor._id,
            newValue: { name: deal.name, value: deal.value, stage: deal.stage },
            metadata: { leadId: lead._id, customerId: customer._id },
          },
        ],
        { session }
      );

      return { lead: convertedLead, customer, deal };
    });
  }
}

module.exports = LeadConversionService;
