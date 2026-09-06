import mongoose from 'mongoose';

const exchangeSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    offeredBook: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    requestedBook: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    matchLevel: {
      type: String,
      enum: ['perfect', 'strong', 'possible'],
      default: 'strong'
    },
    matchReason: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'scheduled', 'handover_pending', 'completed', 'rejected', 'cancelled'],
      default: 'pending',
      index: true
    },
    meetingSpot: {
      type: String,
      default: ''
    },
    proposedDate: {
      type: String,
      default: ''
    },
    proposedStartTime: {
      type: String,
      default: ''
    },
    proposedEndTime: {
      type: String,
      default: ''
    },
    proposedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    scheduleConfirmedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.models.Exchange || mongoose.model('Exchange', exchangeSchema);
