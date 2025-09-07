import User from "../models/user.js";
import MedicalHistory from "../models/medical-history.js";
import { logUserActivityAndRequest } from "../middleware/logger.js";
import { handlePasswordChange } from "../utils/user.js";
import mongoose from "mongoose";
import Conversation from "../models/conversation.js";
import crypto from "crypto";
import { sendEmail } from "../utils/mailer.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

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
      
      // Store OTP data directly in user document temporarily
      user.tempEmailUpdate = {
        newEmail: email,
        otp,
        expiration
      };
      await user.save();
      
      // Send verification email
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const templatePath = path.join(__dirname, "../template", "update-account.ejs");
      let html = await fs.readFile(templatePath, "utf8");
      html = html.replace("${OTP}", otp);
      
      await sendEmail(email, "Verify Your Email Update - Cutis", html);
      
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
  const userId = req.user.id || req.user._id;
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (!user.tempEmailUpdate) {
      return res.status(400).json({ error: "No email update session found. Please try updating your email again." });
    }
    
    // Check if OTP matches and hasn't expired
    if (user.tempEmailUpdate.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    
    if (new Date() > user.tempEmailUpdate.expiration) {
      // Clear expired temp data
      user.tempEmailUpdate = undefined;
      await user.save();
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }
    
    // OTP is valid, proceed with email update
    const newEmail = user.tempEmailUpdate.newEmail;
    user.email = newEmail;
    user.tempEmailUpdate = undefined; // Clear temp data
    await user.save();
    
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
    next(err);
  }
};

export const getAllMedicalHistory = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const history = await MedicalHistory.find({ user_id: userId })
      .populate('condition_id')
      .sort({ diagnosis_date: -1 });

    const simplifiedHistory = history.map((entry) => ({
      _id: entry._id,
      id: entry._id,
      upload_skin: entry.upload_skin,
      diagnosis_date: entry.diagnosis_date,
      condition: {
        description: entry.condition_id?.description || "",
        severity: entry.condition_id?.severity || "",
        name: entry.condition_id?.name || "",
        recommendation: entry.condition_id?.recommendation || ""
      },
      condition_description: entry.condition_id?.description || "",
      severity: entry.condition_id?.severity || "",
      treatment_recommendation: entry.treatment_recommendation || "",
      created_at: entry.created_at
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

    const historyEntry = await MedicalHistory.findOne({ _id: historyId, user_id: userId })
      .populate('condition_id')
      .populate('specialists')
      .populate('clinics')
      .lean();

    if (!historyEntry) {
      return next({ status: 404, message: "Medical history entry not found" });
    }

    // Transform to match old schema structure
    const transformedHistory = {
      _id: historyEntry._id,
      upload_skin: historyEntry.upload_skin,
      diagnosis_date: historyEntry.diagnosis_date,
      treatment_recommendation: historyEntry.treatment_recommendation,
      created_at: historyEntry.created_at,
      condition: historyEntry.condition_id ? {
        _id: historyEntry.condition_id._id,
        name: historyEntry.condition_id.name,
        description: historyEntry.condition_id.description,
        severity: historyEntry.condition_id.severity,
        recommendation: historyEntry.condition_id.recommendation
      } : null,
      specialists: historyEntry.specialists || [],
      clinics: historyEntry.clinics || []
    };

    res.status(200).json({
      success: true,
      history: transformedHistory,
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

    const result = await MedicalHistory.findOneAndDelete({ _id: historyId, user_id: userId });

    if (!result) {
      return next({ status: 404, message: "Medical history entry not found" });
    }
    
    // Delete all conversations referencing this medical history entry
    await Conversation.deleteMany({ user: userId, medicalHistory: historyId });
    await logUserActivityAndRequest({
      userId: userId,
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
