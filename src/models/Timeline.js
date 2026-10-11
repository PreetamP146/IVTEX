const mongoose = require('mongoose');
const { TIMELINE_ACTION_LIST, ENTITY_TYPE_LIST } = require('../constants');

const timelineSchema = new mongoose.Schema(
  {
    action: { type: String, enum: TIMELINE_ACTION_LIST, required: true },
    entityType: { type: String, enum: ENTITY_TYPE_LIST, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { versionKey: false } }
);

timelineSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
timelineSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Timeline', timelineSchema);
