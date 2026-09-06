import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.Mixed,
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
      required: true,
      trim: true,
      index: true
    },
    edition: {
      type: String,
      default: 'Standard Edition',
      trim: true
    },
    isbn: {
      type: String,
      default: '',
      trim: true,
      index: true
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true
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
      max: 8,
      index: true
    },
    condition: {
      type: String,
      enum: ['Like New', 'Very Good', 'Good', 'Acceptable'],
      required: true
    },
    originalPrice: {
      type: Number,
      default: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      default: 0,
      index: true
    },
    transactionType: {
      type: String,
      enum: ['buy', 'exchange', 'donate'],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'hidden', 'exchanged'],
      default: 'available',
      index: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    images: {
      type: [String],
      default: []
    },
    wantedBookTitle: {
      type: String,
      default: null
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

bookSchema.index({ title: 'text', author: 'text', subject: 'text', isbn: 'text' });

export default mongoose.models.Book || mongoose.model('Book', bookSchema);
