import mongoose from "mongoose";

const SavedFilterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,

    filter_params: {
      status: String,
      mode: String, // online, offline, hybrid
      platform: String,
      country: String,
      state: String,
      city: String,
      tags: [String],
      min_prize: Number,
      max_prize: Number,
      deadline: String, // "7days", "30days"
      team_size_min: Number,
      team_size_max: Number,
      solo_allowed: Boolean,
    },

    sort_params: {
      sortBy: { type: String, default: "urgency_score" },
      order: { type: String, default: "desc" },
    },

    is_default: { type: Boolean, default: false },
    usage_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SavedFilterSchema.index({ user: 1, is_default: 1 });
SavedFilterSchema.index({ user: 1, usage_count: -1 });

/* Ensure only one default filter per user */
SavedFilterSchema.pre("save", async function (next) {
  if (this.is_default) {
    await mongoose.model("SavedFilter").updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { is_default: false }
    );
  }
  next();
});

export default mongoose.model("SavedFilter", SavedFilterSchema);
