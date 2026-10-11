const { z } = require('zod');
const { CUSTOMER_STATUS_LIST } = require('../constants');
const {
  objectId,
  email,
  phone,
  shortText,
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
  address: address.optional(),
  status: z.enum(CUSTOMER_STATUS_LIST).optional(),
  assignedTo: objectId.optional(),
});

const update = z
  .object({
    name: shortText(150),
    email,
    phone,
    company: shortText(150),
    address,
    status: z.enum(CUSTOMER_STATUS_LIST),
    assignedTo: objectId,
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

const list = listQuery(['name', 'email', 'company', 'status', 'createdAt'])
  .extend({
    status: z.enum(CUSTOMER_STATUS_LIST).optional(),
    assignedTo: objectId.optional(),
    createdFrom: dateStart.optional(),
    createdTo: dateEnd.optional(),
  })
  .refine((q) => !q.createdFrom || !q.createdTo || q.createdFrom <= q.createdTo, {
    message: 'createdFrom must not be after createdTo',
    path: ['createdFrom'],
  });

module.exports = { create, update, list };
