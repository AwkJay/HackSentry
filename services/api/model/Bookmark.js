import mongoose from "mongoose";

const BookmarkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hackathon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnifiedHackathon",
      required: true,
    },

    reminder_settings: {
      days_7: { type: Boolean, default: true },
      days_2: { type: Boolean, default: true },
      hours_12: { type: Boolean, default: true },
    },

    notifications_sent: {
      days_7: { type: Boolean, default: false },
      days_2: { type: Boolean, default: false },
      hours_12: { type: Boolean, default: false },
    },

    notes: String,
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  { timestamps: true }
);

/* Compound unique index - user can bookmark a hackathon only once */
BookmarkSchema.index({ user: 1, hackathon: 1 }, { unique: true });
BookmarkSchema.index({ user: 1, createdAt: -1 });

/* Update bookmark count on hackathon when bookmark is created */
BookmarkSchema.post("save", async function () {
  const UnifiedHackathon = mongoose.model("UnifiedHackathon");
  const count = await mongoose.model("Bookmark").countDocuments({
    hackathon: this.hackathon,
  });
  await UnifiedHackathon.findByIdAndUpdate(this.hackathon, {
    "metadata.bookmark_count": count,
  });
});

/* Decrement bookmark count when removed */
BookmarkSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const UnifiedHackathon = mongoose.model("UnifiedHackathon");
    const count = await mongoose.model("Bookmark").countDocuments({
      hackathon: doc.hackathon,
    });
    await UnifiedHackathon.findByIdAndUpdate(doc.hackathon, {
      "metadata.bookmark_count": count,
    });
  }
});

export default mongoose.model("Bookmark", BookmarkSchema);
