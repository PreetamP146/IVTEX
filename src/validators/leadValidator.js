const { z } = require('zod');
const { LEAD_SOURCE_LIST, LEAD_STATUS_LIST, PRIORITY_LIST } = require('../constants');
const {
  objectId,
  email,
  phone,
  shortText,
  longText,
  dateStart,
  dateEnd,
  address,
  listQuery,
  atLeastOneField,
  AT_LEAST_ONE_FIELD,
} = require('./common');

const create = z.object({
  name: shortText(150),
  email,
  phone: phone.optional(),
  company: shortText(150).optional(),
  source: z.enum(LEAD_SOURCE_LIST),
  priority: z.enum(PRIORITY_LIST).optional(),
  description: longText.optional(),
  assignedTo: objectId.optional(),
});

const update = z
  .object({
    name: shortText(150),
    email,
    phone,
    company: shortText(150),
    source: z.enum(LEAD_SOURCE_LIST),
    priority: z.enum(PRIORITY_LIST),
    description: longText,
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

const updateStatus = z.object({ status: z.enum(LEAD_STATUS_LIST) });

const assign = z.object({ assignedTo: objectId });

const convert = z.object({
  customer: z
    .object({
      phone: phone.optional(),
      company: shortText(150).optional(),
      address: address.optional(),
    })
    .optional(),
  deal: z.object({
    name: shortText(150),
    value: z.number().positive().max(1e12),
    probability: z.number().min(0).max(100).optional(),
    expectedClosingDate: z.coerce.date(),
    description: longText.optional(),
  }),
});

const list = listQuery(['name', 'email', 'company', 'status', 'priority', 'source', 'createdAt'])
  .extend({
    status: z.enum(LEAD_STATUS_LIST).optional(),
    priority: z.enum(PRIORITY_LIST).optional(),
    source: z.enum(LEAD_SOURCE_LIST).optional(),
    assignedTo: objectId.optional(),
    createdFrom: dateStart.optional(),
    createdTo: dateEnd.optional(),
  })
  .refine((q) => !q.createdFrom || !q.createdTo || q.createdFrom <= q.createdTo, {
    message: 'createdFrom must not be after createdTo',
    path: ['createdFrom'],
  });

module.exports = { create, update, updateStatus, assign, convert, list };
