import mongoose from 'mongoose';

const bookRequestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    author: {
      type: String,
      default: '',
      trim: true
    },
    isbn: {
      type: String,
      default: '',
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8
    },
    preferredPrice: {
      type: Number,
      default: 0
    },
    conditionPref: {
      type: String,
      default: 'Any Condition'
    },
    description: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'fulfilled', 'closed'],
      default: 'active',
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.models.BookRequest || mongoose.model('BookRequest', bookRequestSchema);
