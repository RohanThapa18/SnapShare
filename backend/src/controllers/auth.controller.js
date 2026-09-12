import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import { User } from "../models/index.js";
import { signToken } from "../services/tokenService.js";
import { AppError } from "../utils/AppError.js";

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

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+passwordHash");
  const match = await user.comparePassword(currentPassword);
  if (!match) {
    throw new AppError("Current password is incorrect", 401, "INVALID_CURRENT_PASSWORD");
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  res.status(200).json({ success: true, message: "Password updated" });
});
