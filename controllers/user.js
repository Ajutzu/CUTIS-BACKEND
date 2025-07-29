import User from "../models/user.js";
import { logUserActivityAndRequest } from "../middleware/logger.js";
import { handlePasswordChange, handleEmailChange } from "../utils/user.js";
import mongoose from "mongoose";
import Conversation from "../models/conversation.js";

export const updateAccount = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { name, email, currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (newPassword) {
      await handlePasswordChange(user, currentPassword, newPassword);
    }
    await handleEmailChange(user, email);
    if (name) user.name = name;
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

    await logUserActivityAndRequest({
      userId: user._id,
      action: "View Medical History",
      module: "Medical Records",
      status: "Success",
      req,
    });

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

    await logUserActivityAndRequest({
      userId: user._id,
      action: "View Specific Medical History",
      module: "Medical Records",
      status: "Success",
      req,
    });

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
