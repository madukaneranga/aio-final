import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";

// Required authentication - user must be logged in
export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return (req.user = null);
      //return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });
    }

    console.error("Auth error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Optional authentication - works for both logged in and guest users
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      // No token provided, set up guest user
      //req.user = await setupGuestUser(req, res);
      req.user = null;

      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      // Invalid user, set up guest user
      //req.user = await setupGuestUser(req, res);
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });
    }

    // On any auth error, set up guest user
    //req.user = await setupGuestUser(req, res);
    req.user = null;
    next();
  }
};

// Helper function to setup guest user
const setupGuestUser = async (req, res) => {
  let guestId = req.cookies.guestId;

  if (!guestId) {
    // Generate new guest ID
    guestId = uuidv4();

    // Set guest ID cookie (expires in 30 days)
    res.cookie("guestId", guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  return {
    _id: null,
    guestId: guestId,
    isGuest: true,
    role: "guest",
    name: "",
    email: "",
    storeId: "",
    profileImage: "",
  };
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Skip role check for guest users if 'guest' is in allowed roles
    if (req.user.isGuest && roles.includes("guest")) {
      return next();
    }

    // Regular users need proper role
    if (req.user.isGuest || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  };
};
