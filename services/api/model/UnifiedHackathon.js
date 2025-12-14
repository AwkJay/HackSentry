import mongoose from "mongoose";

const UnifiedHackathonSchema = new mongoose.Schema(
  {
    platform: String,
    uuid: String,
    slug: { type: String, unique: true },
    title: { type: String, required: true },
    description: String,

    start_date: Date,
    end_date: Date,
    registration_deadline: Date,

    is_online: Boolean,
    participation_mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
    },

    url: String,
    logo_url: String,

    prize_money: {
      total: Number,
      currency: { type: String, default: "INR" },
      has_prize: Boolean,
      breakdown: [String],
    },

    tags: [String],

    eligibility: {
      target_audience: [String],
      open_to: String,
    },

    team_size: {
      min: Number,
      max: Number,
      solo_allowed: Boolean,
    },

    organizer: {
      name: String,
      type: String,
      verified: Boolean,
    },

    location: {
      venue: String,
      city: String,
      state: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    status: {
      type: String,
      enum: ["upcoming", "ongoing", "past"],
      index: true,
    },

    metadata: {
      added_date: { type: Date, default: Date.now },
      last_updated: Date,
      view_count: { type: Number, default: 0 },
      bookmark_count: { type: Number, default: 0 },
      is_verified: Boolean,
      data_source: String,
    },

    computed_fields: {
      days_until_event: Number,
      days_until_deadline: Number,
      urgency_score: Number,
    },
  },
  { timestamps: true }
);

/* 🔍 Text Search */
UnifiedHackathonSchema.index({
  title: "text",
  description: "text",
  tags: "text",
  "location.city": "text",
  "organizer.name": "text",
});

export default mongoose.model("UnifiedHackathon", UnifiedHackathonSchema);
