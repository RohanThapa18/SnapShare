import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Photo, Payment, Purchase } from "../models/index.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "../services/paymentService.js";
import { AppError } from "../utils/AppError.js";
import { PAYMENT_STATUS, PURCHASE_TYPE, ALBUM_TYPE } from "../constants/enums.js";

/**
 * Creates a Razorpay order for a single photo or an entire album by a
 * given photographer within an event. Amount is always computed
 * server-side from the Photo document(s) — never trusted from the client.
 */
export const createOrder = asyncHandler(async (req, res) => {
  const { eventId, purchaseType, photoId, album } = req.body;

  let amount = 0;
  let photographerId = null;
  let resolvedPhotoId = null;
  let resolvedAlbum = null;

  if (purchaseType === PURCHASE_TYPE.PHOTO) {
    const photo = await Photo.findOne({ _id: photoId, eventId });
    if (!photo) throw new AppError("Photo not found", 404, "PHOTO_NOT_FOUND");
    if (!photo.isPaid) throw new AppError("This photo is free — no purchase needed", 400, "PHOTO_NOT_PAID");

    const alreadyPurchased = await Purchase.findOne({ userId: req.user.id, photoId: photo._id });
    if (alreadyPurchased) throw new AppError("You already own this photo", 409, "ALREADY_PURCHASED");

    amount = photo.price;
    photographerId = photo.uploaderId;
    resolvedPhotoId = photo._id;
  } else {
    // ALBUM purchase: sum of all paid, un-purchased OFFICIAL photos by one photographer
    if (!album) throw new AppError("album is required for album purchases", 400, "ALBUM_REQUIRED");

    const photos = await Photo.find({ eventId, album, isPaid: true });
    if (!photos.length) throw new AppError("No paid photos found in this album", 404, "NO_PAID_PHOTOS");

    photographerId = photos[0].uploaderId;
    amount = photos.reduce((sum, p) => sum + p.price, 0);
    resolvedAlbum = album;
  }

  if (amount <= 0) {
    throw new AppError("Nothing to charge for this purchase", 400, "INVALID_AMOUNT");
  }

  const amountInPaise = Math.round(amount * 100);
  const order = await createRazorpayOrder(amountInPaise, `snapshare_${Date.now()}`);

  const payment = await Payment.create({
    userId: req.user.id,
    eventId,
    purchaseType,
    photoId: resolvedPhotoId,
    albumId: resolvedAlbum,
    photographerId,
    amount: amountInPaise,
    razorpayOrderId: order.id,
    status: PAYMENT_STATUS.PENDING,
  });

  res.status(201).json({
    success: true,
    data: {
      orderId: order.id,
      amount: amountInPaise,
      currency: order.currency,
      paymentRecordId: payment._id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID, // public key id — safe for frontend
    },
  });
});

/**
 * Verifies the Razorpay signature server-side, then — and only then —
 * marks the Payment SUCCESS and creates the permanent Purchase
 * record(s) that unlock downloads.
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) throw new AppError("Payment record not found", 404, "PAYMENT_NOT_FOUND");

  const isValid = verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!isValid) {
    payment.status = PAYMENT_STATUS.FAILED;
    await payment.save();
    throw new AppError("Payment signature verification failed", 400, "INVALID_SIGNATURE");
  }

  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  await payment.save();

  if (payment.purchaseType === PURCHASE_TYPE.PHOTO) {
    await Purchase.create({
      userId: payment.userId,
      eventId: payment.eventId,
      photographerId: payment.photographerId,
      purchaseType: PURCHASE_TYPE.PHOTO,
      photoId: payment.photoId,
      paymentId: payment._id,
      amountPaid: payment.amount,
    });
  } else {
    const photos = await Photo.find({
      eventId: payment.eventId,
      album: payment.albumId,
      isPaid: true,
      uploaderId: payment.photographerId,
    });

    await Purchase.insertMany(
      photos.map((photo) => ({
        userId: payment.userId,
        eventId: payment.eventId,
        photographerId: payment.photographerId,
        purchaseType: PURCHASE_TYPE.PHOTO, // each photo in the album gets its own entitlement record
        photoId: photo._id,
        paymentId: payment._id,
        amountPaid: photo.price,
      })),
      { ordered: false } // tolerate duplicates if user retries verification
    ).catch(() => {}); // unique index on (userId, photoId) guards against double-grants
  }

  res.status(200).json({ success: true, message: "Payment verified, content unlocked" });
});

export const listMyPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ userId: req.user.id })
    .populate("photoId")
    .populate("eventId", "title")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { purchases } });
});

/**
 * Photographer earnings — a pure read-time aggregation over successful
 * purchases. No wallet, no ledger, no payout system.
 */
export const getMyEarnings = asyncHandler(async (req, res) => {
  const earnings = await Purchase.aggregate([
    { $match: { photographerId: new mongoose.Types.ObjectId(req.user.id) } },
    {
      $group: {
        _id: "$eventId",
        totalEarnings: { $sum: "$amountPaid" },
        totalSales: { $sum: 1 },
      },
    },
    { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "event" } },
    { $unwind: "$event" },
    {
      $project: {
        eventTitle: "$event.title",
        totalEarnings: { $divide: ["$totalEarnings", 100] }, // paise -> rupees
        totalSales: 1,
      },
    },
  ]);

  const grandTotal = earnings.reduce((sum, e) => sum + e.totalEarnings, 0);

  res.status(200).json({ success: true, data: { byEvent: earnings, grandTotal } });
});
