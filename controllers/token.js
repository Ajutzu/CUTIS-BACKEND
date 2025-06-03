import { clearCookie } from '../utils/cookies.js';
import User from '../models/user.js';

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
    
    res.status(200).json({
      message: "Authentication token is valid",
      isAuthenticated: true,
      user: {
        id: latestUser._id,
        name: latestUser.name,
        email: latestUser.email,
        role: latestUser.role,
        googleProfileUrl: latestUser.googleProfileUrl
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  clearCookie(res, 'token');
  res.status(200).json({ message: "Logged out successfully" });
};
