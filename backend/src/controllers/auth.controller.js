import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import { User } from "../models/index.js";
import { signToken } from "../services/tokenService.js";
import { AppError } from "../utils/AppError.js";

import {
  uploadAvatarToCloudinary,
  getAvatarUrl,
  deleteCloudinaryAsset,
} from "../services/cloudinaryService.js";

const SALT_ROUNDS = 12;

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError("An account with this email already exists", 409, "EMAIL_TAKEN");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });

  const token = signToken(user._id.toString());
  res.cookie("token", token, cookieOptions());

  res.status(201).json({
    success: true,
    message: "Account created",
    data: { user: user.toJSON(), token },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !user.isActive) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const match = await user.comparePassword(password);
  if (!match) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const token = signToken(user._id.toString());
  res.cookie("token", token, cookieOptions());

  res.status(200).json({
    success: true,
    message: "Logged in",
    data: { user: user.toJSON(), token },
  });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", cookieOptions());
  res.status(200).json({ success: true, message: "Logged out" });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  res.status(200).json({ success: true, data: { user } });
});

export const updateMe = asyncHandler(async (req, res) => {
  const updates = {};
  if (req.body.name) updates.name = req.body.name;
  if (req.body.avatarUrl) updates.avatarUrl = req.body.avatarUrl;

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, message: "Profile updated", data: { user } });
});

export const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Please choose an image to upload", 400, "NO_FILE");
  }

  const user = await User.findById(req.user.id).select("+avatarPublicId");
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const uploaded = await uploadAvatarToCloudinary(req.file.buffer, user._id.toString());
  const oldPublicId = user.avatarPublicId;

  try {
    user.avatarUrl = getAvatarUrl(uploaded.public_id);
    user.avatarPublicId = uploaded.public_id;
    await user.save();
  } catch (err) {
    await deleteCloudinaryAsset(uploaded.public_id).catch(() => {});
    throw err;
  }

  if (oldPublicId) await deleteCloudinaryAsset(oldPublicId).catch(() => {});

  res.status(200).json({
    success: true,
    message: "Profile photo updated",
    data: { user },
  });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("+avatarPublicId");
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  const oldPublicId = user.avatarPublicId;
  user.avatarUrl = null;
  user.avatarPublicId = null;
  await user.save();

  if (oldPublicId) await deleteCloudinaryAsset(oldPublicId).catch(() => {});

  res.status(200).json({
    success: true,
    message: "Profile photo removed",
    data: { user },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+passwordHash");
  const match = await user.comparePassword(currentPassword);
  if (!match) {
    throw new AppError("Current password is incorrect", 401, "INVALID_CURRENT_PASSWORD");
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordChangedAt = new Date();
  await user.save();

  // Every older token is now invalid, so give THIS session a fresh one
  const token = signToken(user._id.toString());
  res.cookie("token", token, cookieOptions());

  res.status(200).json({ success: true, message: "Password updated", data: { token } });
});
