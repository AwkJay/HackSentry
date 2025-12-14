import mongoose from "mongoose";

/* In-memory filter storage for demo mode */
const demoFilters = new Map();

const isMongoConnected = () => mongoose.connection.readyState === 1;

/* Create a new saved filter */
export const createFilter = async (req, res) => {
  try {
    const { name, description, filter_params, sort_params, is_default } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Filter name is required" });
    }

    if (isMongoConnected()) {
      const SavedFilter = (await import("../model/SavedFilter.js")).default;
      const filter = await SavedFilter.create({
        user: req.user._id,
        name,
        description,
        filter_params,
        sort_params,
        is_default,
      });
      return res.status(201).json({ success: true, filter });
    }

    /* Demo mode */
    const filterId = `filter_${Date.now()}`;

    /* If setting as default, unset others */
    if (is_default) {
      for (const [key, f] of demoFilters.entries()) {
        if (f.user === req.user._id) {
          f.is_default = false;
        }
      }
    }

    const filter = {
      _id: filterId,
      user: req.user._id,
      name,
      description,
      filter_params: filter_params || {},
      sort_params: sort_params || { sortBy: "urgency_score", order: "desc" },
      is_default: is_default || false,
      usage_count: 0,
      createdAt: new Date(),
    };

    demoFilters.set(filterId, filter);
    res.status(201).json({ success: true, mode: "demo", filter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get all saved filters for user */
export const getFilters = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const SavedFilter = (await import("../model/SavedFilter.js")).default;
      const filters = await SavedFilter.find({ user: req.user._id }).sort({
        is_default: -1,
        usage_count: -1,
      });
      return res.json({ success: true, count: filters.length, filters });
    }

    /* Demo mode */
    const filters = Array.from(demoFilters.values())
      .filter((f) => f.user === req.user._id)
      .sort((a, b) => {
        if (a.is_default !== b.is_default) return b.is_default - a.is_default;
        return b.usage_count - a.usage_count;
      });

    res.json({ success: true, mode: "demo", count: filters.length, filters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get single filter */
export const getFilter = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const SavedFilter = (await import("../model/SavedFilter.js")).default;
      const filter = await SavedFilter.findOne({ _id: req.params.id, user: req.user._id });

      if (!filter) {
        return res.status(404).json({ success: false, message: "Filter not found" });
      }
      return res.json({ success: true, filter });
    }

    /* Demo mode */
    const filter = demoFilters.get(req.params.id);
    if (!filter || filter.user !== req.user._id) {
      return res.status(404).json({ success: false, message: "Filter not found" });
    }

    res.json({ success: true, mode: "demo", filter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Update filter */
export const updateFilter = async (req, res) => {
  try {
    const { name, description, filter_params, sort_params, is_default } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (filter_params) updates.filter_params = filter_params;
    if (sort_params) updates.sort_params = sort_params;
    if (is_default !== undefined) updates.is_default = is_default;

    if (isMongoConnected()) {
      const SavedFilter = (await import("../model/SavedFilter.js")).default;
      const filter = await SavedFilter.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        updates,
        { new: true, runValidators: true }
      );

      if (!filter) {
        return res.status(404).json({ success: false, message: "Filter not found" });
      }
      return res.json({ success: true, filter });
    }

    /* Demo mode */
    const filter = demoFilters.get(req.params.id);
    if (!filter || filter.user !== req.user._id) {
      return res.status(404).json({ success: false, message: "Filter not found" });
    }

    const updated = { ...filter, ...updates };
    demoFilters.set(req.params.id, updated);
    res.json({ success: true, mode: "demo", filter: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Delete filter */
export const deleteFilter = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const SavedFilter = (await import("../model/SavedFilter.js")).default;
      const filter = await SavedFilter.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
      });

      if (!filter) {
        return res.status(404).json({ success: false, message: "Filter not found" });
      }
      return res.json({ success: true, message: "Filter deleted" });
    }

    /* Demo mode */
    const filter = demoFilters.get(req.params.id);
    if (!filter || filter.user !== req.user._id) {
      return res.status(404).json({ success: false, message: "Filter not found" });
    }

    demoFilters.delete(req.params.id);
    res.json({ success: true, mode: "demo", message: "Filter deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Set filter as default */
export const setDefaultFilter = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const SavedFilter = (await import("../model/SavedFilter.js")).default;
      await SavedFilter.updateMany({ user: req.user._id }, { is_default: false });
      const filter = await SavedFilter.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { is_default: true },
        { new: true }
      );

      if (!filter) {
        return res.status(404).json({ success: false, message: "Filter not found" });
      }
      return res.json({ success: true, filter });
    }

    /* Demo mode */
    for (const [key, f] of demoFilters.entries()) {
      if (f.user === req.user._id) {
        f.is_default = key === req.params.id;
      }
    }

    const filter = demoFilters.get(req.params.id);
    if (!filter || filter.user !== req.user._id) {
      return res.status(404).json({ success: false, message: "Filter not found" });
    }

    res.json({ success: true, mode: "demo", filter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Apply filter (increment usage count) */
export const applyFilter = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const SavedFilter = (await import("../model/SavedFilter.js")).default;
      const filter = await SavedFilter.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { $inc: { usage_count: 1 } },
        { new: true }
      );

      if (!filter) {
        return res.status(404).json({ success: false, message: "Filter not found" });
      }
      return res.json({ success: true, filter });
    }

    /* Demo mode */
    const filter = demoFilters.get(req.params.id);
    if (!filter || filter.user !== req.user._id) {
      return res.status(404).json({ success: false, message: "Filter not found" });
    }

    filter.usage_count++;
    res.json({ success: true, mode: "demo", filter });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get default filter for user */
export const getDefaultFilter = async (req, res) => {
  try {
    if (isMongoConnected()) {
      const SavedFilter = (await import("../model/SavedFilter.js")).default;
      const filter = await SavedFilter.findOne({ user: req.user._id, is_default: true });
      return res.json({ success: true, hasDefault: !!filter, filter: filter || null });
    }

    /* Demo mode */
    const filter = Array.from(demoFilters.values()).find(
      (f) => f.user === req.user._id && f.is_default
    );

    res.json({ success: true, mode: "demo", hasDefault: !!filter, filter: filter || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
