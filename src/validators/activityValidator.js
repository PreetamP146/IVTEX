const { z } = require('zod');
const {
  ACTIVITY_TYPE_LIST,
  ACTIVITY_STATUS_LIST,
  ACTIVITY_TYPES,
  ENTITY_TYPE_LIST,
} = require('../constants');
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

const create = z
  .object({
    type: z.enum(ACTIVITY_TYPE_LIST),
    title: shortText(200),
    description: longText.optional(),
    assignedTo: objectId.optional(),
    dueDate: z.coerce.date().optional(),
    relatedType: z.enum(ENTITY_TYPE_LIST).optional(),
    relatedId: objectId.optional(),
  })
  .refine((body) => body.type === ACTIVITY_TYPES.NOTE || body.dueDate, {
    message: 'dueDate is required for this activity type',
    path: ['dueDate'],
  })
  .refine((body) => Boolean(body.relatedType) === Boolean(body.relatedId), {
    message: 'relatedType and relatedId must be provided together',
    path: ['relatedId'],
  });

const update = z
  .object({
    type: z.enum(ACTIVITY_TYPE_LIST),
    title: shortText(200),
    description: longText,
    assignedTo: objectId,
    dueDate: z.coerce.date(),
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

const list = listQuery(['dueDate', 'createdAt', 'title', 'type'], 'dueDate')
  .extend({
    type: z.enum(ACTIVITY_TYPE_LIST).optional(),
    status: z.enum(ACTIVITY_STATUS_LIST).optional(),
    assignedTo: objectId.optional(),
    relatedType: z.enum(ENTITY_TYPE_LIST).optional(),
    relatedId: objectId.optional(),
    dueFrom: dateStart.optional(),
    dueTo: dateEnd.optional(),
  })
  .refine((q) => !q.dueFrom || !q.dueTo || q.dueFrom <= q.dueTo, {
    message: 'dueFrom must not be after dueTo',
    path: ['dueFrom'],
  });

module.exports = { create, update, list };
