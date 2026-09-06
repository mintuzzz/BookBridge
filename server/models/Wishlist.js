import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    },
    book: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

wishlistSchema.index({ user: 1, book: 1 }, { unique: true });

export default mongoose.models.Wishlist || mongoose.model('Wishlist', wishlistSchema);
