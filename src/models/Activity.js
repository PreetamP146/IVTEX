const mongoose = require('mongoose');
const { ACTIVITY_TYPE_LIST, ACTIVITY_STATUSES, ENTITY_TYPE_LIST } = require('../constants');

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPE_LIST, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: [ACTIVITY_STATUSES.PENDING, ACTIVITY_STATUSES.COMPLETED],
      default: ACTIVITY_STATUSES.PENDING,
    },
    relatedType: { type: String, enum: ENTITY_TYPE_LIST },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completedAt: { type: Date },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

activitySchema.index({ assignedTo: 1, status: 1, dueDate: 1 });
activitySchema.index({ status: 1, dueDate: 1 });
activitySchema.index({ relatedType: 1, relatedId: 1, dueDate: -1 });
activitySchema.index({ createdBy: 1 });
activitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
