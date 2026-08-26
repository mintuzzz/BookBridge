import mongoose from 'mongoose';

const handoverOtpSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      index: true
    },
    transactionType: {
      type: String,
      enum: ['exchange', 'sell', 'buy', 'gift', 'donate', 'order'],
      required: true
    },
    purpose: {
      type: String,
      enum: ['HANDOVER_COMPLETION'],
      default: 'HANDOVER_COMPLETION'
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.models.HandoverOtp || mongoose.model('HandoverOtp', handoverOtpSchema);
