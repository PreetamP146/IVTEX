const mongoose = require('mongoose');
const { LEAD_SOURCE_LIST, LEAD_STATUS_LIST, PRIORITY_LIST, LEAD_STATUSES, PRIORITIES } = require('../constants');

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true, maxlength: 150 },
    source: { type: String, enum: LEAD_SOURCE_LIST, required: true },
    status: { type: String, enum: LEAD_STATUS_LIST, default: LEAD_STATUSES.NEW },
    priority: { type: String, enum: PRIORITY_LIST, default: PRIORITIES.MEDIUM },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    description: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },
    convertedAt: { type: Date },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

leadSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ source: 1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
