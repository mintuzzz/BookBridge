import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    institution: {
      type: String,
      default: 'State University of Technology',
      trim: true
    },
    department: {
      type: String,
      default: 'Computer Science',
      trim: true,
      index: true
    },
    semester: {
      type: Number,
      default: 1,
      min: 1,
      max: 8
    },
    avatarUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
    },
    ecoPoints: {
      type: Number,
      default: 50
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 1.0,
      max: 5.0
    }
  },
  { timestamps: true }
);

export default mongoose.models.UserProfile || mongoose.model('UserProfile', userProfileSchema);
