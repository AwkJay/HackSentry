import mongoose from "mongoose";
import { demoTokens, demoUsers } from "../controllers/authCtrl.js";

const isMongoConnected = () => mongoose.connection.readyState === 1;

/* Middleware to protect routes */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token provided",
      });
    }

    if (isMongoConnected()) {
      const jwt = (await import("jsonwebtoken")).default;
      const User = (await import("../model/User.js")).default;
      const JWT_SECRET = process.env.JWT_SECRET || "hacksentry_secret";

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      if (!user.is_active) {
        return res.status(401).json({ success: false, message: "Account is deactivated" });
      }

      req.user = user;
      return next();
    }

    /* Demo mode - check demo tokens */
    if (token.startsWith("demo_")) {
      const userId = demoTokens.get(token);
      if (userId) {
        /* Find user in demo storage */
        for (const [email, userData] of demoUsers.entries()) {
          if (userData._id === userId) {
            const { password: _, ...user } = userData;
            req.user = user;
            return next();
          }
        }
      }
    }

    res.status(401).json({ success: false, message: "Not authorized, token invalid" });
  } catch (error) {
    res.status(401).json({ success: false, message: "Not authorized, token invalid" });
  }
};

/* Optional auth - attaches user if token present */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      if (isMongoConnected()) {
        const jwt = (await import("jsonwebtoken")).default;
        const User = (await import("../model/User.js")).default;
        const JWT_SECRET = process.env.JWT_SECRET || "hacksentry_secret";

        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await User.findById(decoded.id);
          if (user?.is_active) {
            req.user = user;
          }
        } catch (e) {
          /* Token invalid, continue */
        }
      } else if (token.startsWith("demo_")) {
        /* Demo mode */
        const userId = demoTokens.get(token);
        if (userId) {
          for (const [email, userData] of demoUsers.entries()) {
            if (userData._id === userId) {
              const { password: _, ...user } = userData;
              req.user = user;
              break;
            }
          }
        }
      }
    }

    next();
  } catch (error) {
    next();
  }
};
