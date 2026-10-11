const { z } = require('zod');
const { email, phone, password, shortText } = require('./common');

const register = z.object({
  name: shortText(100),
  email,
  phone: phone.optional(),
  password,
});

const login = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

const changePassword = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  })
  .refine((body) => body.currentPassword !== body.newPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  });

module.exports = { register, login, changePassword };
