import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar_url: String,

    preferences: {
      default_filter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SavedFilter",
      },
      notification_settings: {
        email_enabled: { type: Boolean, default: true },
        reminder_7days: { type: Boolean, default: true },
        reminder_2days: { type: Boolean, default: true },
        reminder_12hours: { type: Boolean, default: true },
      },
    },

    profile: {
      skills: [String],
      interests: [String],
      location: {
        city: String,
        state: String,
        country: String,
      },
      experience_level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced"],
      },
    },

    stats: {
      hackathons_attended: { type: Number, default: 0 },
      bookmarks_count: { type: Number, default: 0 },
      last_active: Date,
    },

    is_verified: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* Hash password before saving */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

/* Compare password method */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/* Hide sensitive fields in JSON */
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

UserSchema.index({ "profile.skills": 1 });
UserSchema.index({ "profile.interests": 1 });

export default mongoose.model("User", UserSchema);
