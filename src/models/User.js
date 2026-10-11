const mongoose = require('mongoose');
const { ROLE_LIST, ROLES } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_LIST, default: ROLES.SALES_EXECUTIVE, required: true },
    isActive: { type: Boolean, default: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    refreshTokenHash: { type: String, select: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.refreshTokenHash;
        return ret;
      },
    },
  }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ manager: 1, role: 1 });
userSchema.index({ name: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
