import mongoose from "mongoose";
import Fuse from "fuse.js";

/* Demo search data */
const demoSearches = [
  { query: "ai hackathon", search_count: 45 },
  { query: "web3", search_count: 38 },
  { query: "machine learning", search_count: 32 },
  { query: "blockchain", search_count: 28 },
  { query: "fintech", search_count: 25 },
];

/* Demo hackathons for search */
const demoHackathons = [
  {
    _id: "demo1",
    slug: "ai-innovation-challenge-2024",
    title: "AI Innovation Challenge 2024",
    description: "Build the next generation of AI-powered applications",
    tags: ["AI", "Machine Learning", "Innovation"],
    status: "upcoming",
    organizer: { name: "Tech Corp" },
    location: { city: "Bangalore" },
  },
  {
    _id: "demo2",
    slug: "web3-hackathon-india",
    title: "Web3 Hackathon India",
    description: "Build decentralized applications for the future",
    tags: ["Web3", "Blockchain", "DeFi", "NFT"],
    status: "upcoming",
    organizer: { name: "Crypto Labs" },
    location: { city: "Mumbai" },
  },
  {
    _id: "demo3",
    slug: "climate-tech-challenge",
    title: "Climate Tech Challenge",
    description: "Create sustainable solutions for climate change",
    tags: ["Climate", "Sustainability", "Green Tech"],
    status: "upcoming",
    organizer: { name: "Green Foundation" },
    location: { city: "Delhi" },
  },
];

const isMongoConnected = () => mongoose.connection.readyState === 1;

/* Fuzzy search hackathons */
export const search = async (req, res) => {
  try {
    const { q, page = 1, limit = 20, fuzzy = "true", status, mode } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    if (isMongoConnected()) {
      /* MongoDB search */
      const UnifiedHackathon = (await import("../model/UnifiedHackathon.js")).default;
      const SearchAnalytics = (await import("../model/SearchAnalytics.js")).default;

      const baseFilter = {};
      if (status) baseFilter.status = status;
      if (mode) baseFilter.participation_mode = mode;

      let results;
      let total;

      if (fuzzy === "true") {
        const hackathons = await UnifiedHackathon.find(baseFilter).lean();
        const fuse = new Fuse(hackathons, {
          keys: [
            { name: "title", weight: 0.4 },
            { name: "description", weight: 0.2 },
            { name: "tags", weight: 0.2 },
            { name: "organizer.name", weight: 0.1 },
            { name: "location.city", weight: 0.1 },
          ],
          threshold: 0.4,
          includeScore: true,
        });

        const fuseResults = fuse.search(q);
        total = fuseResults.length;
        const startIndex = (page - 1) * limit;
        results = fuseResults
          .slice(startIndex, startIndex + Number(limit))
          .map((r) => ({ ...r.item, _searchScore: 1 - r.score }));
      } else {
        const query = UnifiedHackathon.find({ ...baseFilter, $text: { $search: q } });
        query.select({ score: { $meta: "textScore" } });
        query.sort({ score: { $meta: "textScore" } });
        total = await UnifiedHackathon.countDocuments({ ...baseFilter, $text: { $search: q } });
        results = await query.skip((page - 1) * limit).limit(Number(limit)).lean();
      }

      await SearchAnalytics.trackSearch(q, total, req.user?._id || null);

      return res.json({
        success: true,
        query: q,
        fuzzy: fuzzy === "true",
        count: results.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        results,
      });
    }

    /* Demo mode - fuzzy search */
    let data = [...demoHackathons];
    if (status) data = data.filter((h) => h.status === status);

    const fuse = new Fuse(data, {
      keys: ["title", "description", "tags", "organizer.name", "location.city"],
      threshold: 0.4,
      includeScore: true,
    });

    const fuseResults = fuse.search(q);
    const total = fuseResults.length;
    const startIndex = (page - 1) * limit;
    const results = fuseResults
      .slice(startIndex, startIndex + Number(limit))
      .map((r) => ({ ...r.item, _searchScore: 1 - r.score }));

    res.json({
      success: true,
      mode: "demo",
      query: q,
      fuzzy: true,
      count: results.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get search suggestions */
export const getSuggestions = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    if (isMongoConnected()) {
      const UnifiedHackathon = (await import("../model/UnifiedHackathon.js")).default;
      const SearchAnalytics = (await import("../model/SearchAnalytics.js")).default;

      const titleSuggestions = await UnifiedHackathon.find({
        title: { $regex: q, $options: "i" },
      })
        .select("title slug")
        .limit(5)
        .lean();

      const tagSuggestions = await UnifiedHackathon.distinct("tags", {
        tags: { $regex: q, $options: "i" },
      });

      const searchSuggestions = await SearchAnalytics.find({
        query: { $regex: q, $options: "i" },
        search_count: { $gte: 2 },
      })
        .sort({ search_count: -1 })
        .limit(5)
        .select("query -_id")
        .lean();

      return res.json({
        success: true,
        suggestions: {
          hackathons: titleSuggestions,
          tags: tagSuggestions.slice(0, 10),
          searches: searchSuggestions.map((s) => s.query),
        },
      });
    }

    /* Demo mode */
    const qLower = q.toLowerCase();
    const hackathons = demoHackathons
      .filter((h) => h.title.toLowerCase().includes(qLower))
      .slice(0, 5)
      .map((h) => ({ title: h.title, slug: h.slug }));

    const allTags = demoHackathons.flatMap((h) => h.tags);
    const tags = [...new Set(allTags.filter((t) => t.toLowerCase().includes(qLower)))].slice(0, 10);

    const searches = demoSearches
      .filter((s) => s.query.includes(qLower))
      .map((s) => s.query);

    res.json({
      success: true,
      mode: "demo",
      suggestions: { hackathons, tags, searches },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get popular searches */
export const getPopularSearches = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    if (isMongoConnected()) {
      const SearchAnalytics = (await import("../model/SearchAnalytics.js")).default;
      const popular = await SearchAnalytics.getPopular(Number(limit));
      return res.json({ success: true, count: popular.length, searches: popular });
    }

    /* Demo mode */
    const searches = demoSearches.slice(0, Number(limit));
    res.json({ success: true, mode: "demo", count: searches.length, searches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get trending tags */
export const getTrendingTags = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    if (isMongoConnected()) {
      const UnifiedHackathon = (await import("../model/UnifiedHackathon.js")).default;
      const tags = await UnifiedHackathon.aggregate([
        { $match: { status: { $in: ["upcoming", "ongoing"] } } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: Number(limit) },
        { $project: { tag: "$_id", count: 1, _id: 0 } },
      ]);
      return res.json({ success: true, count: tags.length, tags });
    }

    /* Demo mode */
    const tagCounts = {};
    demoHackathons.forEach((h) => h.tags.forEach((t) => (tagCounts[t] = (tagCounts[t] || 0) + 1)));
    const tags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, Number(limit))
      .map(([tag, count]) => ({ tag, count }));

    res.json({ success: true, mode: "demo", count: tags.length, tags });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
