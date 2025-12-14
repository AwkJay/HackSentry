import mongoose from "mongoose";

/* In-memory storage for demo mode */
const demoUsers = new Map();
const demoTokens = new Map();

const isMongoConnected = () => mongoose.connection.readyState === 1;

/* Generate simple demo token */
const generateDemoToken = (userId) => {
  const token = `demo_${userId}_${Date.now()}`;
  demoTokens.set(token, userId);
  return token;
};

/* Register new user */
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Please provide email, password, and name",
      });
    }

    if (isMongoConnected()) {
      const User = (await import("../model/User.js")).default;
      const jwt = (await import("jsonwebtoken")).default;
      const JWT_SECRET = process.env.JWT_SECRET || "hacksentry_secret";

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }

      const user = await User.create({ email, password, name });
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

      return res.status(201).json({ success: true, token, user });
    }

    /* Demo mode */
    if (demoUsers.has(email)) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const userId = `demo_${Date.now()}`;
    const user = {
      _id: userId,
      email,
      name,
      createdAt: new Date(),
      preferences: { notification_settings: { email_enabled: true } },
      stats: { bookmarks_count: 0 },
    };

    demoUsers.set(email, { ...user, password });
    const token = generateDemoToken(userId);

    res.status(201).json({ success: true, mode: "demo", token, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Login user */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    if (isMongoConnected()) {
      const User = (await import("../model/User.js")).default;
      const jwt = (await import("jsonwebtoken")).default;
      const JWT_SECRET = process.env.JWT_SECRET || "hacksentry_secret";

      const user = await User.findOne({ email }).select("+password");
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      user.stats.last_active = new Date();
      await user.save();

      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
      return res.json({ success: true, token, user });
    }

    /* Demo mode */
    const userData = demoUsers.get(email);
    if (!userData || userData.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const { password: _, ...user } = userData;
    const token = generateDemoToken(user._id);

    res.json({ success: true, mode: "demo", token, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Get current user profile */
export const getMe = async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Update user profile */
export const updateProfile = async (req, res) => {
  try {
    const allowedFields = ["name", "avatar_url", "profile", "preferences"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (isMongoConnected()) {
      const User = (await import("../model/User.js")).default;
      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      });
      return res.json({ success: true, user });
    }

    /* Demo mode */
    const user = { ...req.user, ...updates };
    res.json({ success: true, mode: "demo", user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Update notification preferences */
export const updateNotificationSettings = async (req, res) => {
  try {
    const settings = req.body;

    if (isMongoConnected()) {
      const User = (await import("../model/User.js")).default;
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { "preferences.notification_settings": settings },
        { new: true }
      );
      return res.json({ success: true, user });
    }

    /* Demo mode */
    const user = {
      ...req.user,
      preferences: { ...req.user.preferences, notification_settings: settings },
    };
    res.json({ success: true, mode: "demo", user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* Export demo tokens for auth middleware */
export { demoTokens, demoUsers };
