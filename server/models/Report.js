import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: ['listing', 'user'],
      required: true
    },
    targetId: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'dismissed'],
      default: 'pending',
      index: true
    },
    adminAction: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export default mongoose.models.Report || mongoose.model('Report', reportSchema);
