const { z } = require('zod');
const { DEAL_STAGE_LIST, DEAL_STATUS_LIST } = require('../constants');
const {
  objectId,
  shortText,
  longText,
  dateStart,
  dateEnd,
  listQuery,
  atLeastOneField,
  AT_LEAST_ONE_FIELD,
} = require('./common');

const value = z.number().positive('Deal value must be greater than zero').max(1e12);
const probability = z.number().min(0).max(100);

const create = z.object({
  name: shortText(150),
  customerId: objectId,
  value,
  probability: probability.optional(),
  expectedClosingDate: z.coerce.date(),
  description: longText.optional(),
  assignedTo: objectId.optional(),
});

const update = z
  .object({
    name: shortText(150),
    value,
    probability,
    expectedClosingDate: z.coerce.date(),
    description: longText,
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

const changeStage = z.object({
  stage: z.enum(DEAL_STAGE_LIST),
  lostReason: z.string().trim().max(500).optional(),
  probability: probability.optional(),
});

const assign = z.object({ assignedTo: objectId });

const list = listQuery(
  ['name', 'value', 'expectedRevenue', 'probability', 'expectedClosingDate', 'stage', 'createdAt']
)
  .extend({
    stage: z.enum(DEAL_STAGE_LIST).optional(),
    status: z.enum(DEAL_STATUS_LIST).optional(),
    assignedTo: objectId.optional(),
    customer: objectId.optional(),
    minAmount: z.coerce.number().min(0).optional(),
    maxAmount: z.coerce.number().min(0).optional(),
    closingFrom: dateStart.optional(),
    closingTo: dateEnd.optional(),
    createdFrom: dateStart.optional(),
    createdTo: dateEnd.optional(),
  })
  .refine((q) => q.minAmount === undefined || q.maxAmount === undefined || q.minAmount <= q.maxAmount, {
    message: 'minAmount must not be greater than maxAmount',
    path: ['minAmount'],
  })
  .refine((q) => !q.closingFrom || !q.closingTo || q.closingFrom <= q.closingTo, {
    message: 'closingFrom must not be after closingTo',
    path: ['closingFrom'],
  })
  .refine((q) => !q.createdFrom || !q.createdTo || q.createdFrom <= q.createdTo, {
    message: 'createdFrom must not be after createdTo',
    path: ['createdFrom'],
  });

module.exports = { create, update, changeStage, assign, list };
