import mongoose from "mongoose";

const SearchAnalyticsSchema = new mongoose.Schema(
  {
    query: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    normalized_query: {
      type: String,
      lowercase: true,
      trim: true,
    },
    search_count: { type: Number, default: 1 },
    results_count: { type: Number, default: 0 },
    avg_results: { type: Number, default: 0 },

    /* Track which users searched (for personalization later) */
    user_searches: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    last_searched: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SearchAnalyticsSchema.index({ query: 1 }, { unique: true });
SearchAnalyticsSchema.index({ search_count: -1 });
SearchAnalyticsSchema.index({ last_searched: -1 });

/* Static method to track a search */
SearchAnalyticsSchema.statics.trackSearch = async function (
  query,
  resultsCount,
  userId = null
) {
  const normalized = query.toLowerCase().trim();

  const update = {
    $inc: { search_count: 1 },
    $set: {
      last_searched: new Date(),
      results_count: resultsCount,
    },
  };

  if (userId) {
    update.$push = {
      user_searches: {
        $each: [{ user: userId, timestamp: new Date() }],
        $slice: -100, // Keep last 100 user searches
      },
    };
  }

  return await this.findOneAndUpdate(
    { query: normalized },
    {
      ...update,
      $setOnInsert: { normalized_query: normalized },
    },
    { upsert: true, new: true }
  );
};

/* Get popular searches */
SearchAnalyticsSchema.statics.getPopular = async function (limit = 10) {
  return await this.find({ search_count: { $gte: 2 } })
    .sort({ search_count: -1 })
    .limit(limit)
    .select("query search_count -_id");
};

export default mongoose.model("SearchAnalytics", SearchAnalyticsSchema);
