import mongoose from "mongoose";

/* In-memory bookmark storage for demo mode */
const demoBookmarks = new Map();

const isMongoConnected = () => mongoose.connection.readyState === 1;

/* Create a bookmark */
export const createBookmark = async (req, res) => {
  try {
    const { hackathonId, reminder_settings, notes, priority } = req.body;

    if (!hackathonId) {
      return res.status(400).json({ success: false, message: "Hackathon ID is required" });
    }

    if (isMongoConnected()) {
      const Bookmark = (await import("../model/Bookmark.js")).default;
      const User = (await import("../model/User.js")).default;

      const existing = await Bookmark.findOne({ user: req.user._id, hackathon: hackathonId });
      if (existing) {
        return res.status(400).json({ success: false, message: "Already bookmarked" });
      }

      const bookmark = await Bookmark.create({
        user: req.user._id,
        hackathon: hackathonId,
        reminder_settings: reminder_settings || {},
        notes,
        priority,
      });

      await User.findByIdAndUpdate(req.user._id, { $inc: { "stats.bookmarks_count": 1 } });
      await bookmark.populate("hackathon");

      return res.status(201).json({ success: true, bookmark });
    }

    /* Demo mode */
    const key = `${req.user._id}_${hackathonId}`;
    if (demoBookmarks.has(key)) {
      return res.status(400).json({ success: false, message: "Already bookmarked" });
    }

    const bookmark = {
      _id: `bookmark_${Date.now()}`,
      user: req.user._id,
      hackathon: hackathonId,
      reminder_settings: reminder_settings || { days_7: true, days_2: true, hours_12: true },
      notes,
      priority: priority || "medium",
      createdAt: new Date(),
    };

    demoBookmarks.set(key, bookmark);
    res.status(201).json({ success: true, mode: "demo", bookmark });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get user's bookmarks */
export const getBookmarks = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = req.query;

    if (isMongoConnected()) {
      const Bookmark = (await import("../model/Bookmark.js")).default;
      const sortOrder = order === "desc" ? -1 : 1;

      const bookmarks = await Bookmark.find({ user: req.user._id })
        .populate("hackathon")
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const total = await Bookmark.countDocuments({ user: req.user._id });

      return res.json({
        success: true,
        count: bookmarks.length,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
        bookmarks,
      });
    }

    /* Demo mode */
    let bookmarks = Array.from(demoBookmarks.values()).filter(
      (b) => b.user === req.user._id
    );

    bookmarks.sort((a, b) =>
      order === "desc"
        ? new Date(b[sortBy]) - new Date(a[sortBy])
        : new Date(a[sortBy]) - new Date(b[sortBy])
    );

    const total = bookmarks.length;
    const startIndex = (page - 1) * limit;
    bookmarks = bookmarks.slice(startIndex, startIndex + Number(limit));

    res.json({
      success: true,
      mode: "demo",
      count: bookmarks.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      bookmarks,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get single bookmark */
export const getBookmark = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const Bookmark = (await import("../model/Bookmark.js")).default;
      const bookmark = await Bookmark.findOne({
        _id: req.params.id,
        user: req.user._id,
      }).populate("hackathon");

      if (!bookmark) {
        return res.status(404).json({ success: false, message: "Bookmark not found" });
      }

      return res.json({ success: true, bookmark });
    }

    /* Demo mode */
    const bookmark = Array.from(demoBookmarks.values()).find(
      (b) => b._id === req.params.id && b.user === req.user._id
    );

    if (!bookmark) {
      return res.status(404).json({ success: false, message: "Bookmark not found" });
    }

    res.json({ success: true, mode: "demo", bookmark });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Update bookmark */
export const updateBookmark = async (req, res) => {
  try {
    const { reminder_settings, notes, priority } = req.body;
    const updates = {};

    if (reminder_settings) updates.reminder_settings = reminder_settings;
    if (notes !== undefined) updates.notes = notes;
    if (priority) updates.priority = priority;

    if (isMongoConnected()) {
      const Bookmark = (await import("../model/Bookmark.js")).default;
      const bookmark = await Bookmark.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        updates,
        { new: true, runValidators: true }
      ).populate("hackathon");

      if (!bookmark) {
        return res.status(404).json({ success: false, message: "Bookmark not found" });
      }

      return res.json({ success: true, bookmark });
    }

    /* Demo mode */
    for (const [key, bookmark] of demoBookmarks.entries()) {
      if (bookmark._id === req.params.id && bookmark.user === req.user._id) {
        const updated = { ...bookmark, ...updates };
        demoBookmarks.set(key, updated);
        return res.json({ success: true, mode: "demo", bookmark: updated });
      }
    }

    res.status(404).json({ success: false, message: "Bookmark not found" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Remove bookmark */
export const removeBookmark = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const Bookmark = (await import("../model/Bookmark.js")).default;
      const User = (await import("../model/User.js")).default;

      const bookmark = await Bookmark.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!bookmark) {
        return res.status(404).json({ success: false, message: "Bookmark not found" });
      }

      await User.findByIdAndUpdate(req.user._id, { $inc: { "stats.bookmarks_count": -1 } });
      return res.json({ success: true, message: "Bookmark removed" });
    }

    /* Demo mode */
    for (const [key, bookmark] of demoBookmarks.entries()) {
      if (bookmark._id === req.params.id && bookmark.user === req.user._id) {
        demoBookmarks.delete(key);
        return res.json({ success: true, mode: "demo", message: "Bookmark removed" });
      }
    }

    res.status(404).json({ success: false, message: "Bookmark not found" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Check if hackathon is bookmarked */
export const checkBookmark = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const Bookmark = (await import("../model/Bookmark.js")).default;
      const bookmark = await Bookmark.findOne({
        user: req.user._id,
        hackathon: req.params.hackathonId,
      });

      return res.json({
        success: true,
        isBookmarked: !!bookmark,
        bookmark: bookmark || null,
      });
    }

    /* Demo mode */
    const key = `${req.user._id}_${req.params.hackathonId}`;
    const bookmark = demoBookmarks.get(key);

    res.json({
      success: true,
      mode: "demo",
      isBookmarked: !!bookmark,
      bookmark: bookmark || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Toggle bookmark */
export const toggleBookmark = async (req, res) => {
  try {
    const { hackathonId } = req.body;

    if (isMongoConnected()) {
      const Bookmark = (await import("../model/Bookmark.js")).default;
      const User = (await import("../model/User.js")).default;

      const existing = await Bookmark.findOne({ user: req.user._id, hackathon: hackathonId });

      if (existing) {
        await Bookmark.findByIdAndDelete(existing._id);
        await User.findByIdAndUpdate(req.user._id, { $inc: { "stats.bookmarks_count": -1 } });
        return res.json({ success: true, action: "removed", isBookmarked: false });
      }

      const bookmark = await Bookmark.create({ user: req.user._id, hackathon: hackathonId });
      await User.findByIdAndUpdate(req.user._id, { $inc: { "stats.bookmarks_count": 1 } });
      await bookmark.populate("hackathon");

      return res.status(201).json({ success: true, action: "created", isBookmarked: true, bookmark });
    }

    /* Demo mode */
    const key = `${req.user._id}_${hackathonId}`;

    if (demoBookmarks.has(key)) {
      demoBookmarks.delete(key);
      return res.json({ success: true, mode: "demo", action: "removed", isBookmarked: false });
    }

    const bookmark = {
      _id: `bookmark_${Date.now()}`,
      user: req.user._id,
      hackathon: hackathonId,
      reminder_settings: { days_7: true, days_2: true, hours_12: true },
      createdAt: new Date(),
    };

    demoBookmarks.set(key, bookmark);
    res.status(201).json({ success: true, mode: "demo", action: "created", isBookmarked: true, bookmark });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
