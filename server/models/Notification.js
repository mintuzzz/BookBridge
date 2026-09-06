import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'system'
    },
    link: {
      type: String,
      default: null
    },
    relatedBook: {
      type: String,
      default: null
    },
    relatedExchange: {
      type: String,
      default: null
    },
    relatedRequest: {
      type: String,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
