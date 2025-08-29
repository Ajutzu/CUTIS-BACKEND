import { clearCookie } from '../utils/cookies.js';
import User from '../models/user.js';
import jwt from "jsonwebtoken";

export const resetTokenChecker = async (req, res, next) => {
  try {
    res.status(200).json({ message: "Reset token is valid" });
  } catch (err) {
    next({
      status: 500,
      error: err.message,
    });
  }
};

export const authTokenChecker = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const latestUser = await User.findById(userId);
    if (!latestUser) {
      return res.status(404).json({
        message: "User not found",
        isAuthenticated: false
      });
    }

    // Reactivate the user if previously deactivated
    if (!latestUser.is_active) {
      latestUser.is_active = true;
    }

    // Update last activity timestamp
    latestUser.updatedAt = new Date();
    await latestUser.save();

    res.status(200).json({
      message: "Authentication token is valid",
      isAuthenticated: true,
      user: {
        id: latestUser._id,
        name: latestUser.name,
        email: latestUser.email,
        role: latestUser.role,
        is_active: latestUser.is_active
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    
    if (!token) return res.status(200).json({ message: "Already logged out" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("JWT verification failed:", err.message);
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log("No user found with ID:", decoded.id);
      return res.status(404).json({ message: "User not found" });
    }

    user.is_active = false;
    await user.save();

    clearCookie(res, "token");

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};
