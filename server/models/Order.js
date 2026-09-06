import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    buyer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    seller: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    book: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    transactionType: {
      type: String,
      enum: ['buy', 'exchange', 'donate'],
      required: true,
      default: 'buy'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'scheduled', 'handover_pending', 'reserved', 'ready_for_pickup', 'pickup_pending', 'completed', 'cancelled', 'disputed'],
      default: 'pending',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi'],
      default: 'upi'
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid_at_pickup'],
      default: 'unpaid'
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    },
    pickupOtp: {
      type: String,
      required: true
    },
    qrCodeData: {
      type: String,
      required: true
    },
    pickupNotes: {
      type: String,
      default: ''
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

export default mongoose.models.Order || mongoose.model('Order', orderSchema);
