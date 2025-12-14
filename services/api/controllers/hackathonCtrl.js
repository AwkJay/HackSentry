import mongoose from "mongoose";
import Fuse from "fuse.js";

/* Demo data for when MongoDB is not available */
const demoHackathons = [
  {
    _id: "demo1",
    slug: "ai-innovation-challenge-2024",
    title: "AI Innovation Challenge 2024",
    description: "Build the next generation of AI-powered applications",
    platform: "hacksentry",
    start_date: new Date(Date.now() + 7 * 86400000),
    end_date: new Date(Date.now() + 10 * 86400000),
    registration_deadline: new Date(Date.now() + 5 * 86400000),
    is_online: true,
    participation_mode: "online",
    url: "https://example.com/ai-challenge",
    logo_url: "https://picsum.photos/200",
    prize_money: { total: 100000, currency: "INR", has_prize: true },
    tags: ["AI", "Machine Learning", "Innovation"],
    team_size: { min: 1, max: 4, solo_allowed: true },
    organizer: { name: "Tech Corp", type: "company", verified: true },
    location: { city: "Bangalore", state: "Karnataka", country: "India" },
    status: "upcoming",
    metadata: { view_count: 150, bookmark_count: 45 },
    computed_fields: { urgency_score: 75, days_until_deadline: 5 },
  },
  {
    _id: "demo2",
    slug: "web3-hackathon-india",
    title: "Web3 Hackathon India",
    description: "Build decentralized applications for the future",
    platform: "hacksentry",
    start_date: new Date(Date.now() + 14 * 86400000),
    end_date: new Date(Date.now() + 17 * 86400000),
    registration_deadline: new Date(Date.now() + 10 * 86400000),
    is_online: false,
    participation_mode: "hybrid",
    url: "https://example.com/web3-hack",
    logo_url: "https://picsum.photos/201",
    prize_money: { total: 500000, currency: "INR", has_prize: true },
    tags: ["Web3", "Blockchain", "DeFi", "NFT"],
    team_size: { min: 2, max: 5, solo_allowed: false },
    organizer: { name: "Crypto Labs", type: "startup", verified: true },
    location: { city: "Mumbai", state: "Maharashtra", country: "India" },
    status: "upcoming",
    metadata: { view_count: 320, bookmark_count: 89 },
    computed_fields: { urgency_score: 60, days_until_deadline: 10 },
  },
  {
    _id: "demo3",
    slug: "climate-tech-challenge",
    title: "Climate Tech Challenge",
    description: "Create sustainable solutions for climate change",
    platform: "hacksentry",
    start_date: new Date(Date.now() + 3 * 86400000),
    end_date: new Date(Date.now() + 5 * 86400000),
    registration_deadline: new Date(Date.now() + 2 * 86400000),
    is_online: true,
    participation_mode: "online",
    url: "https://example.com/climate-tech",
    logo_url: "https://picsum.photos/202",
    prize_money: { total: 250000, currency: "INR", has_prize: true },
    tags: ["Climate", "Sustainability", "Green Tech"],
    team_size: { min: 1, max: 6, solo_allowed: true },
    organizer: { name: "Green Foundation", type: "ngo", verified: true },
    location: { city: "Delhi", state: "Delhi", country: "India" },
    status: "upcoming",
    metadata: { view_count: 210, bookmark_count: 67 },
    computed_fields: { urgency_score: 90, days_until_deadline: 2 },
  },
  {
    _id: "demo4",
    slug: "fintech-innovation-summit",
    title: "Fintech Innovation Summit",
    description: "Revolutionize the financial services industry",
    platform: "hacksentry",
    start_date: new Date(Date.now() + 21 * 86400000),
    end_date: new Date(Date.now() + 23 * 86400000),
    registration_deadline: new Date(Date.now() + 18 * 86400000),
    is_online: false,
    participation_mode: "offline",
    url: "https://example.com/fintech-summit",
    logo_url: "https://picsum.photos/203",
    prize_money: { total: 750000, currency: "INR", has_prize: true },
    tags: ["Fintech", "Banking", "Payments", "UPI"],
    team_size: { min: 3, max: 5, solo_allowed: false },
    organizer: { name: "Bank of Innovation", type: "bank", verified: true },
    location: { city: "Hyderabad", state: "Telangana", country: "India" },
    status: "upcoming",
    metadata: { view_count: 180, bookmark_count: 42 },
    computed_fields: { urgency_score: 45, days_until_deadline: 18 },
  },
  {
    _id: "demo5",
    slug: "healthcare-ai-hackathon",
    title: "Healthcare AI Hackathon",
    description: "AI solutions for better healthcare outcomes",
    platform: "hacksentry",
    start_date: new Date(Date.now() - 2 * 86400000),
    end_date: new Date(Date.now() + 1 * 86400000),
    registration_deadline: new Date(Date.now() - 5 * 86400000),
    is_online: true,
    participation_mode: "online",
    url: "https://example.com/healthcare-ai",
    logo_url: "https://picsum.photos/204",
    prize_money: { total: 200000, currency: "INR", has_prize: true },
    tags: ["Healthcare", "AI", "Medical", "Diagnostics"],
    team_size: { min: 2, max: 4, solo_allowed: false },
    organizer: { name: "MedTech Inc", type: "company", verified: true },
    location: { city: "Chennai", state: "Tamil Nadu", country: "India" },
    status: "ongoing",
    metadata: { view_count: 450, bookmark_count: 120 },
    computed_fields: { urgency_score: 80, days_until_deadline: -5 },
  },
];

/* Check if MongoDB is connected */
const isMongoConnected = () => mongoose.connection.readyState === 1;

/* Import the real model only when needed */
let UnifiedHackathon = null;
const getModel = async () => {
  if (!UnifiedHackathon) {
    const module = await import("../model/UnifiedHackathon.js");
    UnifiedHackathon = module.default;
  }
  return UnifiedHackathon;
};

/* Helper to apply filters to demo data */
const applyFilters = (data, query) => {
  let filtered = [...data];

  if (query.status) {
    filtered = filtered.filter((h) => h.status === query.status);
  }
  if (query.mode) {
    filtered = filtered.filter((h) => h.participation_mode === query.mode);
  }
  if (query.tags) {
    const tags = query.tags.split(",");
    filtered = filtered.filter((h) =>
      h.tags.some((t) => tags.includes(t.toLowerCase()))
    );
  }
  if (query.closingSoon === "true") {
    const today = new Date();
    filtered = filtered.filter(
      (h) =>
        h.registration_deadline > today &&
        h.registration_deadline <= new Date(today.getTime() + 7 * 86400000)
    );
  }

  return filtered;
};

/* Get all hackathons with filters */
export const getHackathons = async (req, res) => {
  try {
    const { page = 1, limit = 24, search, sortBy = "urgency_score", order = "desc" } = req.query;

    if (isMongoConnected()) {
      /* Use MongoDB */
      const { buildHackathonQuery, buildSortConfig } = await import("../utils/queryBuilder.js");
      const Model = await getModel();

      const filter = buildHackathonQuery(req.query);
      const sort = buildSortConfig(req.query);

      let query = Model.find(filter);
      if (search) {
        query = query.find({ $text: { $search: search } });
      }
      query = query.sort(sort);

      const total = await Model.countDocuments(query.getFilter());
      const data = await query.skip((page - 1) * limit).limit(Number(limit));

      return res.json({
        success: true,
        count: data.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        data,
      });
    }

    /* Demo mode - use in-memory data */
    let data = applyFilters(demoHackathons, req.query);

    /* Apply search with fuzzy matching */
    if (search) {
      const fuse = new Fuse(data, {
        keys: ["title", "description", "tags"],
        threshold: 0.4,
      });
      data = fuse.search(search).map((r) => r.item);
    }

    /* Sort */
    const sortKey = sortBy === "urgency_score" || sortBy === "urgency" 
      ? "computed_fields.urgency_score" 
      : sortBy;
    data.sort((a, b) => {
      const aVal = sortKey.includes(".") 
        ? sortKey.split(".").reduce((o, k) => o?.[k], a) 
        : a[sortKey];
      const bVal = sortKey.includes(".") 
        ? sortKey.split(".").reduce((o, k) => o?.[k], b) 
        : b[sortKey];
      return order === "desc" ? (bVal || 0) - (aVal || 0) : (aVal || 0) - (bVal || 0);
    });

    /* Paginate */
    const total = data.length;
    const startIndex = (page - 1) * limit;
    data = data.slice(startIndex, startIndex + Number(limit));

    res.json({
      success: true,
      mode: "demo",
      count: data.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get single hackathon by slug */
export const getSingleHackathon = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const Model = await getModel();
      const hackathon = await Model.findOne({ slug: req.params.slug });

      if (!hackathon) {
        return res.status(404).json({ success: false, message: "Not found" });
      }

      hackathon.metadata.view_count += 1;
      await hackathon.save();
      return res.json({ success: true, data: hackathon });
    }

    /* Demo mode */
    const hackathon = demoHackathons.find((h) => h.slug === req.params.slug);
    if (!hackathon) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, mode: "demo", data: hackathon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get trending hackathons */
export const getTrendingHackathons = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    if (isMongoConnected()) {
      const Model = await getModel();
      const data = await Model.find({ status: { $in: ["upcoming", "ongoing"] } })
        .sort({ "metadata.bookmark_count": -1, "metadata.view_count": -1 })
        .limit(Number(limit));
      return res.json({ success: true, count: data.length, data });
    }

    /* Demo mode */
    const data = [...demoHackathons]
      .filter((h) => ["upcoming", "ongoing"].includes(h.status))
      .sort((a, b) => (b.metadata?.bookmark_count || 0) - (a.metadata?.bookmark_count || 0))
      .slice(0, Number(limit));

    res.json({ success: true, mode: "demo", count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get closing soon hackathons */
export const getClosingSoon = async (req, res) => {
  try {
    const { limit = 10, days = 7 } = req.query;
    const today = new Date();

    if (isMongoConnected()) {
      const Model = await getModel();
      const data = await Model.find({
        status: { $in: ["upcoming", "ongoing"] },
        registration_deadline: {
          $gte: today,
          $lte: new Date(today.getTime() + Number(days) * 86400000),
        },
      })
        .sort({ registration_deadline: 1 })
        .limit(Number(limit));

      return res.json({
        success: true,
        count: data.length,
        closingWithin: `${days} days`,
        data,
      });
    }

    /* Demo mode */
    const data = demoHackathons
      .filter(
        (h) =>
          ["upcoming", "ongoing"].includes(h.status) &&
          h.registration_deadline > today &&
          h.registration_deadline <= new Date(today.getTime() + Number(days) * 86400000)
      )
      .sort((a, b) => a.registration_deadline - b.registration_deadline)
      .slice(0, Number(limit));

    res.json({
      success: true,
      mode: "demo",
      count: data.length,
      closingWithin: `${days} days`,
      data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get hackathons by urgency */
export const getUrgent = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    if (isMongoConnected()) {
      const Model = await getModel();
      const data = await Model.find({ status: { $in: ["upcoming", "ongoing"] } })
        .sort({ "computed_fields.urgency_score": -1 })
        .limit(Number(limit));
      return res.json({ success: true, count: data.length, data });
    }

    /* Demo mode */
    const data = [...demoHackathons]
      .filter((h) => ["upcoming", "ongoing"].includes(h.status))
      .sort((a, b) => (b.computed_fields?.urgency_score || 0) - (a.computed_fields?.urgency_score || 0))
      .slice(0, Number(limit));

    res.json({ success: true, mode: "demo", count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get similar hackathons */
export const getSimilarHackathons = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    if (isMongoConnected()) {
      const Model = await getModel();
      const hackathon = await Model.findOne({ slug: req.params.slug });

      if (!hackathon) {
        return res.status(404).json({ success: false, message: "Not found" });
      }

      const similar = await Model.find({
        _id: { $ne: hackathon._id },
        status: { $in: ["upcoming", "ongoing"] },
        $or: [
          { tags: { $in: hackathon.tags || [] } },
          { "location.city": hackathon.location?.city },
        ],
      })
        .sort({ "computed_fields.urgency_score": -1 })
        .limit(Number(limit));

      return res.json({ success: true, count: similar.length, data: similar });
    }

    /* Demo mode */
    const hackathon = demoHackathons.find((h) => h.slug === req.params.slug);
    if (!hackathon) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const similar = demoHackathons
      .filter(
        (h) =>
          h._id !== hackathon._id &&
          ["upcoming", "ongoing"].includes(h.status) &&
          (h.tags.some((t) => hackathon.tags.includes(t)) ||
            h.location?.city === hackathon.location?.city)
      )
      .slice(0, Number(limit));

    res.json({ success: true, mode: "demo", count: similar.length, data: similar });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get hackathon stats */
export const getStats = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const Model = await getModel();
      const [upcoming, ongoing, past, total] = await Promise.all([
        Model.countDocuments({ status: "upcoming" }),
        Model.countDocuments({ status: "ongoing" }),
        Model.countDocuments({ status: "past" }),
        Model.countDocuments({}),
      ]);

      const topTags = await Model.aggregate([
        { $match: { status: { $in: ["upcoming", "ongoing"] } } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      return res.json({
        success: true,
        stats: {
          total,
          upcoming,
          ongoing,
          past,
          topTags: topTags.map((t) => ({ tag: t._id, count: t.count })),
        },
      });
    }

    /* Demo mode */
    const upcoming = demoHackathons.filter((h) => h.status === "upcoming").length;
    const ongoing = demoHackathons.filter((h) => h.status === "ongoing").length;
    const past = demoHackathons.filter((h) => h.status === "past").length;

    /* Count tags */
    const tagCounts = {};
    demoHackathons
      .filter((h) => ["upcoming", "ongoing"].includes(h.status))
      .forEach((h) => h.tags.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    res.json({
      success: true,
      mode: "demo",
      stats: {
        total: demoHackathons.length,
        upcoming,
        ongoing,
        past,
        topTags,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
