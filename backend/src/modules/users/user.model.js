import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      // CRITICAL FIX 1: Removed `required: true` and added `sparse: true`. 
      // If a user logs in with phone OTP, they don't have an email yet. 
      // If email is required, MongoDB will crash and block the login!
      unique: true,
      sparse: true, 
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    dob: {
      type: Date,
    },
    isAdult: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      // CRITICAL FIX 2: Added 'Admin' to the enum.
      // If 'Admin' isn't here, you won't be able to log into the Admin panel!
      enum: ['Artist', 'Art Lover', 'Business', 'Gallery', 'Admin', null],
      default: 'Art Lover', // Safer default than null
    },
    subRoles: [
      {
        type: String,
      },
    ],
    interests: [
      {
        // CRITICAL FIX 3: Changed from ObjectId to String.
        // Our new Feed ranking algorithm assumes tags are strings (e.g., "mandala"). 
        // If we use ObjectIds, the feed algorithm will fail to rank posts properly.
        type: String, 
      },
    ],
    stats: {
      followers: { type: Number, default: 0 },
      following: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    bio: {
      type: String,
      maxLength: 300,
      default: '',
    },
    nsfwBlurEnabled: {
      type: Boolean,
      default: true,
    },
    pushTokens: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// I kept your pre-save hook! It's a great way to handle the age calculation.
userSchema.pre('save', function (next) {
  if (this.isModified('dob') && this.dob) {
    const ageDifMs = Date.now() - this.dob.getTime();
    const ageDate = new Date(ageDifMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    this.isAdult = age >= 18;
  }
  next();
});

// Optimize Admin dashboard filtering and RBAC lookups
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

export const User = mongoose.model('User', userSchema);