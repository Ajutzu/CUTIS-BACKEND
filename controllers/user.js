import User from "../models/user.js";
import { logUserActivityAndRequest } from "../middleware/logger.js";
import { handlePasswordChange } from "../utils/user.js";
import mongoose from "mongoose";
import Conversation from "../models/conversation.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendEmail } from "../utils/mailer.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { setCookie, clearCookie } from "../utils/cookies.js";

export const updateAccount = async (req, res, next) => {
  try {
    console.log("requestion");
    const userId = req.user.id || req.user._id;
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ message: "User not found." });
    
    // Handle password change if provided
    if (newPassword) {
      await handlePasswordChange(user, currentPassword, newPassword);
    }
    
    // Handle name change if provided
    if (name) user.name = name;
    
    // If email is being changed, send verification OTP
    if (email && email !== user.email) {
      // Check if email is already in use
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: "Email is already in use by another account." });
      }
      
      // Generate OTP and expiration (10 minutes)
      const otp = crypto.randomInt(1000, 9999).toString();
      const expiration = new Date(Date.now() + 10 * 60 * 1000);
      
      // Store temporary update data
      const tempUpdate = {
        userId: user._id,
        newEmail: email,
        otp,
        expiration,
        originalEmail: user.email
      };
      
      // Send verification email
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const templatePath = path.join(__dirname, "../template", "update-account.ejs");
      let html = await fs.readFile(templatePath, "utf8");
      html = html.replace("${OTP}", otp);
      
      await sendEmail(email, "Verify Your Email Update - Cutis", html);
      
      // Store temporary data in JWT token
      const tempToken = jwt.sign(
        { tempUpdate },
        process.env.JWT_SECRET,
        { expiresIn: "10m" }
      );
      
      setCookie(res, 'temp_update', tempToken);
      
      // Log the OTP request
      await logUserActivityAndRequest({
        userId: user._id,
        action: "Email Update OTP Sent",
        module: "User Management",
        status: "Success",
        req,
      });
      
      return res.status(200).json({ 
        message: "Email verification code sent to your new email. Please verify to complete the update.",
        requiresVerification: true
      });
    }
    
    // If no email change, save immediately
    await user.save();
    
    await logUserActivityAndRequest({
      userId: user._id,
      action: "Update Account",
      module: "User Management",
      status: "Success",
      req,
    });
    
    res.status(200).json({ message: "Account updated successfully." });
  } catch (error) {
    next(error);
  }
};
// New function to verify email update OTP
export const verifyEmailUpdate = async (req, res, next) => {
  const { otp } = req.body;
  const tempToken = req.cookies.temp_update;
  
  try {
    if (!tempToken) {
      return res.status(400).json({ error: "Update session expired. Please try again." });
    }
    
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    const tempUpdate = decoded.tempUpdate;
    
    if (!tempUpdate) {
      return res.status(400).json({ error: "Invalid update session" });
    }
    
    // Check if OTP matches and hasn't expired
    if (tempUpdate.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    
    if (new Date() > tempUpdate.expiration) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }
    
    // OTP is valid, proceed with email update
    const user = await User.findById(tempUpdate.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Update the email
    user.email = tempUpdate.newEmail;
    await user.save();
    
    // Clear temporary update cookie
    clearCookie(res, "temp_update");
    
    // Log the successful email update
    await logUserActivityAndRequest({
      userId: user._id,
      action: "Email Updated",
      module: "User Management",
      status: "Success",
      req,
    });
    
    res.status(200).json({ 
      message: "Email updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
      }
    });
    
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: "Invalid update session" });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ error: "Update session expired" });
    }
    next(err);
  }
};

export const getAllMedicalHistory = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return next({ status: 404, message: "User not found." });
    }

    const simplifiedHistory = user.medical_history
      .slice()
      .reverse()
      .map((entry) => ({
        id: entry._id,
        upload_skin: entry.upload_skin,
        diagnosis_date: entry.diagnosis_date,
        condition_description: entry.condition?.description || "",
        severity: entry.condition?.severity || "",
      }));

    res.status(200).json({
      success: true,
      medical_history: simplifiedHistory,
    });
  } catch (error) {
    next(error);
  }
};

export const getMedicalHistoryById = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const historyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(historyId)) {
      return next({ status: 400, message: "Invalid history ID format" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return next({ status: 404, message: "User not found." });
    }

    const historyEntry = user.medical_history.id(historyId);

    if (!historyEntry) {
      return next({ status: 404, message: "Medical history entry not found" });
    }

    res.status(200).json({
      success: true,
      history: historyEntry,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMedicalHistoryById = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const historyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(historyId)) {
      return next({ status: 400, message: "Invalid history ID format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return next({ status: 404, message: "User not found." });
    }

    const result = await User.updateOne(
      { _id: userId },
      { $pull: { medical_history: { _id: historyId } } }
    );
    if (result.modifiedCount === 0) {
      return next({ status: 404, message: "Medical history entry not found" });
    }
    
    // Delete all conversations referencing this medical history entry
    await Conversation.deleteMany({ user: userId, medicalHistory: historyId });
    await logUserActivityAndRequest({
      userId: user._id,
      action: "Delete Medical History",
      module: "Medical Records",
      status: "Success",
      req,
    });
    res
      .status(200)
      .json({
        success: true,
        message: "Medical history entry and related conversations deleted.",
      });
  } catch (error) {
    next(error);
  }
};
