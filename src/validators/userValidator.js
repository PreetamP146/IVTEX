const { z } = require('zod');
const { ROLE_LIST } = require('../constants');
const {
  objectId,
  email,
  phone,
  password,
  shortText,
  booleanQuery,
  listQuery,
  atLeastOneField,
  AT_LEAST_ONE_FIELD,
} = require('./common');

const create = z.object({
  name: shortText(100),
  email,
  phone: phone.optional(),
  password,
  role: z.enum(ROLE_LIST),
  managerId: objectId.optional(),
  isActive: z.boolean().optional(),
});

const update = z
  .object({
    name: shortText(100),
    email,
    phone,
    password,
    role: z.enum(ROLE_LIST),
    managerId: objectId.nullable(),
  })
  .partial()
  .refine(atLeastOneField, AT_LEAST_ONE_FIELD);

const setStatus = z.object({ isActive: z.boolean() });

const list = listQuery(['name', 'email', 'role', 'createdAt']).extend({
  role: z.enum(ROLE_LIST).optional(),
  isActive: booleanQuery.optional(),
  manager: objectId.optional(),
});

const team = listQuery(['name', 'email', 'createdAt'], 'name').extend({
  isActive: booleanQuery.optional(),
});

module.exports = { create, update, setStatus, list, team };
