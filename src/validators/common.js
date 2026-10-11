const { z } = require('zod');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid id');

const email = z.string().trim().toLowerCase().email('Must be a valid email address').max(254);

const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s\-().]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{7,15}$/, 'Must be a valid phone number'));

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const shortText = (max = 150) => z.string().trim().min(1).max(max);
const longText = z.string().trim().max(2000);

const dateStart = z.coerce.date();

const dateEnd = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Must be a valid date')
  .transform((value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value)
  );

const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');

const idParams = z.object({ id: objectId });

const address = z.object({
  street: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

const listQuery = (sortFields, defaultSort = 'createdAt') =>
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.enum(sortFields).default(defaultSort),
    order: z.enum(['asc', 'desc']).default('desc'),
    search: z.string().trim().max(100).optional(),
  });

const timelineQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const atLeastOneField = (object) => Object.keys(object).length > 0;
const AT_LEAST_ONE_FIELD = 'At least one field must be provided';

module.exports = {
  objectId,
  email,
  phone,
  password,
  shortText,
  longText,
  dateStart,
  dateEnd,
  booleanQuery,
  idParams,
  address,
  listQuery,
  timelineQuery,
  atLeastOneField,
  AT_LEAST_ONE_FIELD,
};
