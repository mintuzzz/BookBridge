import mongoose from 'mongoose';

const pickupVerificationSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true
    },
    otpCode: {
      type: String,
      required: true
    },
    qrCodeData: {
      type: String,
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.models.PickupVerification || mongoose.model('PickupVerification', pickupVerificationSchema);
