import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true
    },
    otpHash: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      enum: ['REGISTER', 'PASSWORD_RESET', 'EMAIL_CHANGE'],
      default: 'REGISTER',
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '10m' } // Mongoose TTL index to auto-delete after 10 minutes
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5
    },
    verified: {
      type: Boolean,
      default: false
    },
    tempUserData: {
      type: Object,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.models.OtpVerification || mongoose.model('OtpVerification', otpVerificationSchema);
