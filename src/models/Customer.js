const mongoose = require('mongoose');
const { CUSTOMER_STATUS_LIST, CUSTOMER_STATUSES } = require('../constants');

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true, maxlength: 150 },
    address: { type: addressSchema, default: undefined },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: undefined },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: CUSTOMER_STATUS_LIST, default: CUSTOMER_STATUSES.ACTIVE },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

customerSchema.index({ lead: 1 }, { unique: true, sparse: true });
customerSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
customerSchema.index({ status: 1 });
customerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);
