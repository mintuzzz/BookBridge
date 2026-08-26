import mongoose from 'mongoose';

const adminActionSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    actionType: {
      type: String,
      required: true
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    targetBook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export default mongoose.models.AdminAction || mongoose.model('AdminAction', adminActionSchema);
