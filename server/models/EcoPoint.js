import mongoose from 'mongoose';

const ecoPointSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    points: {
      type: Number,
      required: true
    },
    action: {
      type: String,
      enum: ['donate', 'exchange', 'reuse', 'register'],
      required: true
    },
    description: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.models.EcoPoint || mongoose.model('EcoPoint', ecoPointSchema);
