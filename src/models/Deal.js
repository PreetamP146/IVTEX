const mongoose = require('mongoose');
const { DEAL_STAGE_LIST, DEAL_STAGES } = require('../constants');

const dealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: undefined },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    value: { type: Number, required: true, min: [0.01, 'Deal value must be greater than zero'] },
    probability: { type: Number, required: true, min: 0, max: 100 },
    expectedRevenue: { type: Number, required: true, min: 0 },
    expectedClosingDate: { type: Date, required: true },
    stage: { type: String, enum: DEAL_STAGE_LIST, default: DEAL_STAGES.QUALIFICATION },
    description: { type: String, trim: true, maxlength: 2000 },
    lostReason: { type: String, trim: true, maxlength: 500 },
    closedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

dealSchema.index({ assignedTo: 1, stage: 1 });
dealSchema.index({ stage: 1, expectedClosingDate: 1 });
dealSchema.index({ customer: 1 });
dealSchema.index({ lead: 1 });
dealSchema.index({ value: 1 });
dealSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Deal', dealSchema);
