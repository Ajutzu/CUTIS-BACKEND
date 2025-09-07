
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import dotenv from "dotenv";
import crypto from "crypto";
import { logUserActivityAndRequest } from "../middleware/logger.js";
import { sendEmail } from "../utils/mailer.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";  
import { OAuth2Client } from "google-auth-library";
import { setCookie } from "../utils/cookies.js";

dotenv.config();

// Google OAuth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Google Login
export const googleLogin = async (req, res, next) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) return next({ status: 400, error: "Invalid token" });

    let user = await User.findOne({ email });

    let isNewUser = false;
    if (!user) {
      user = new User({
        name,
        email,
        password: crypto.randomBytes(32).toString("hex"),
        role: "User",
        is_active: true,
      });
      await user.save();
      isNewUser = true;
    } else {
      user.is_active = true;
      await user.save();
    }

    const yourToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await logUserActivityAndRequest({
      userId: user._id,
      action: isNewUser ? "Register (Google)" : "Login (Google)",
      module: "Auth",
      status: "Success",
      req,
    });

    // ✅ set cookie
    setCookie(res, "auth", yourToken);

    // ✅ also return token in response body as fallback
    res.status(200).json({
      message: "Google login successful",
      token: yourToken, // <-- fallback here
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Login
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return next({ status: 400, error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return next({ status: 400, error: "Invalid email or password" });

    user.is_active = true;
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await logUserActivityAndRequest({
      userId: user._id,
      action: "Login",
      module: "Auth",
      status: "Success",
      req,
    });

    // ✅ set cookie
    setCookie(res, "auth", token);

    // ✅ also return token in response body as fallback
    res.json({
      message: "Login Successfully",
      token, // <-- fallback here
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Registration - Step 1: Send OTP
export const registerUser = async (req, res, next) => {
  const { name, email, password, role } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already exists" });

    // Generate OTP and expiration (10 minutes)
    const otp = crypto.randomInt(1000, 9999).toString();
    const expiration = new Date(Date.now() + 10 * 60 * 1000);

    // Create temporary user with OTP data
    const tempUser = new User({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role,
      is_active: false, // Not active until verified
      tempRegistration: {
        otp,
        expiration,
        isVerified: false
      }
    });
    
    await tempUser.save();

    // Send verification email
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const templatePath = path.join(__dirname, "../template", "verification.ejs");
    let html = await fs.readFile(templatePath, "utf8");
    html = html.replace("${OTP}", otp);
    
    await sendEmail(email, "Verify Your Email - Cutis Registration", html);

    // Logger
    await logUserActivityAndRequest({
      userId: null,
      action: "Registration OTP Sent",
      module: "Auth",
      status: "Success",
      req,
    });

    res.status(200).json({ 
      message: "OTP verification code sent to your email. Please verify to complete registration." 
    });

  } catch (err) {
    next(err);
  }
};

// Registration - Step 2: Verify OTP and Complete Registration
export const verifyRegistrationOTP = async (req, res, next) => {
  const { otp, email } = req.body;

  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ error: "Registration session not found. Please try registering again." });
    }

    if (!user.tempRegistration) {
      return res.status(400).json({ error: "No verification session found. Please try registering again." });
    }

    // Check if OTP matches and hasn't expired
    if (user.tempRegistration.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (new Date() > user.tempRegistration.expiration) {
      // Clean up expired registration
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({ error: "OTP has expired. Please register again." });
    }

    // OTP is valid, activate the user
    user.is_active = true;
    user.tempRegistration = undefined; // Clear temp data
    await user.save();

    // Send welcome email
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const welcomeTemplatePath = path.join(__dirname, "../template", "welcome.ejs");
    let welcomeHtml = await fs.readFile(welcomeTemplatePath, "utf8");
    
    await sendEmail(user.email, "Welcome to Cutis!", welcomeHtml);

    // Logger
    await logUserActivityAndRequest({
      userId: user._id,
      action: "Register",
      module: "Auth",
      status: "Success",
      req,
    });

    res.status(201).json({ 
      message: "User registered successfully. Welcome email sent!" 
    });

  } catch (err) {
    next(err);
  }
};

// Forgot Password
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = crypto.randomInt(1000, 9999).toString();
    const expiration = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.expiration = expiration;
    await user.save();

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const templatePath = path.join(__dirname, "../template", "otp.ejs");
    let html = await fs.readFile(templatePath, "utf8");
    html = html.replace("${OTP}", otp);
    await sendEmail(user.email, "Your OTP Code", html);
    
    // Logger
    await logUserActivityAndRequest({
      userId: user._id,
      action: "Request OTP",
      module: "Auth",
      status: "Success",
      req,
    });

    res.json({ success: true, message: "OTP has been sent to your email." });
  } catch (err) {
    next(err);
  }
};

// OTP Checker
export const OTPChecker = async (req, res, next) => {
  const { otp, email } = req.body;
  console.log(otp, email);

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (user.expiration < now) {
      // Clear expired OTP
      user.otp = undefined;
      user.expiration = undefined;
      await user.save();
      return res.status(400).json({ error: "OTP has expired" });
    }

    res.json({ success: true, message: "OTP is valid" });
  } catch (err) {
    next(err);
  }
};

// Update Password
export const updatePassword = async (req, res, next) => {
  const { newPassword, email, otp } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    if (user.otp !== otp || user.expiration < now) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = undefined;
    user.expiration = undefined;

    await user.save();

    // Logger
    await logUserActivityAndRequest({
      userId: user._id,
      action: "Password Reset",
      module: "Auth",
      status: "Success",
      req,
    });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
};
