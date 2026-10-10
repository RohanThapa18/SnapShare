import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Event, EventParticipant, Photo, Payment, Purchase } from "../models/index.js";
import { PAYMENT_STATUS, PURCHASE_TYPE, EVENT_STATUS } from "../constants/enums.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "../services/paymentService.js";
import { AppError } from "../utils/AppError.js";


export const createOrder = asyncHandler(async (req, res) => {
  const { eventId, purchaseType, photoId, album, photographerId: requestedPhotographerId } = req.body;

  // Only joined participants of a still-active event can start a purchase
  const [event, membership] = await Promise.all([
    Event.findById(eventId).select("status expiryDate"),
    EventParticipant.exists({ eventId, userId: req.user.id }),
  ]);
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
  if (!membership) throw new AppError("You must join this event before buying photos", 403, "NOT_EVENT_MEMBER");
  if (event.status !== EVENT_STATUS.ACTIVE || event.expiryDate < new Date()) {
    throw new AppError("This event has expired, so new purchases are disabled", 403, "EVENT_EXPIRED");
  }

  let amount = 0; // rupees
  let photographerId = null;
  let resolvedPhotoId = null;
  let resolvedAlbum = null;

  if (purchaseType === PURCHASE_TYPE.PHOTO) {
    if (!photoId) throw new AppError("photoId is required for photo purchases", 400, "PHOTO_ID_REQUIRED");

    const photo = await Photo.findOne({ _id: photoId, eventId });
    if (!photo) throw new AppError("Photo not found", 404, "PHOTO_NOT_FOUND");
    if (!photo.isPaid || Number(photo.price) <= 0) throw new AppError("This photo is free — no purchase needed", 400, "PHOTO_NOT_PAID");

    const alreadyPurchased = await Purchase.findOne({ userId: req.user.id, photoId: photo._id });
    if (alreadyPurchased) throw new AppError("You already own this photo", 409, "ALREADY_PURCHASED");

    amount = photo.price;
    photographerId = photo.uploaderId;
    resolvedPhotoId = photo._id;
  } else {
    // ALBUM purchase: every paid photo ONE photographer has in this album that the buyer doesn't own yet
    if (!album) throw new AppError("album is required for album purchases", 400, "ALBUM_REQUIRED");
    if (!requestedPhotographerId) {
      throw new AppError("photographerId is required for album purchases", 400, "PHOTOGRAPHER_REQUIRED");
    }

    const ownedPhotoIds = await Purchase.find({ userId: req.user.id, eventId }).distinct("photoId");
    const photos = await Photo.find({
      eventId,
      album,
      uploaderId: requestedPhotographerId,
      isPaid: true,
      price: { $gt: 0 },
      _id: { $nin: ownedPhotoIds },
    });
    if (!photos.length) {
      throw new AppError("Nothing left to buy from this photographer in this album", 404, "NO_PAID_PHOTOS");
    }

    photographerId = requestedPhotographerId;
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
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    },
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
  if (!payment) throw new AppError("Payment record not found", 404, "PAYMENT_NOT_FOUND");

  if (payment.userId.toString() !== req.user.id) {
    throw new AppError("This payment belongs to another account", 403, "NOT_YOUR_PAYMENT");
  }

  // Retrying (flaky network, double click) must be harmless
  if (payment.status === PAYMENT_STATUS.SUCCESS) {
    return res.status(200).json({ success: true, message: "Payment already verified, content unlocked" });
  }

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

  // Unlock first (idempotent upserts), THEN mark SUCCESS, so a crash in the
  // middle can be retried instead of leaving a paid-but-locked purchase.
  const photos =
    payment.purchaseType === PURCHASE_TYPE.PHOTO
      ? await Photo.find({ _id: payment.photoId })
      : await Photo.find({
        eventId: payment.eventId,
        album: payment.albumId,
        isPaid: true,
        uploaderId: payment.photographerId,
      });

  if (photos.length) {
    await Purchase.bulkWrite(
      photos.map((photo) => ({
        updateOne: {
          filter: { userId: payment.userId, photoId: photo._id },
          update: {
            $setOnInsert: {
              userId: payment.userId,
              eventId: payment.eventId,
              photographerId: payment.photographerId,
              purchaseType: PURCHASE_TYPE.PHOTO,
              photoId: photo._id,
              paymentId: payment._id,
              // always paise, same unit as single-photo purchases (price is in rupees)
              amountPaid:
                payment.purchaseType === PURCHASE_TYPE.PHOTO ? payment.amount : Math.round(photo.price * 100),
            },
          },
          upsert: true,
        },
      }))
    );
  }

  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  await payment.save();

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
