import mongoose from 'mongoose';

const exchangeMatchSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bookA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    bookB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    matchLevel: {
      type: String,
      enum: ['perfect', 'strong', 'possible'],
      required: true
    },
    matchReason: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.models.ExchangeMatch || mongoose.model('ExchangeMatch', exchangeMatchSchema);
