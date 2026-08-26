import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    reasonNeeded: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['available', 'requested', 'approved', 'completed'],
      default: 'available',
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.models.Donation || mongoose.model('Donation', donationSchema);
