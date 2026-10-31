import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { Event, EventParticipant, Photo, Payment, Purchase, Payout, User } from "../models/index.js";
import { PAYMENT_STATUS, PURCHASE_TYPE, EVENT_STATUS } from "../constants/enums.js";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature,
  fetchRazorpayPayment,
} from "../services/paymentService.js";
import { AppError } from "../utils/AppError.js";

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

const feeFor = (amountInPaise) => {
  const pct = Math.min(Math.max(Number(process.env.PLATFORM_FEE_PERCENT) || 0, 0), 50);
  return Math.floor((amountInPaise * pct) / 100);
};

// What the photographer actually earns from a purchase (paise)
const NET = { $subtract: ["$amountPaid", { $ifNull: ["$platformFee", 0] }] };
const IS_PAID_OUT = { $ne: [{ $ifNull: ["$payoutId", null] }, null] };

/**
 * Unlocks content for a verified, captured payment. Safe to call many times and
 * concurrently (verify endpoint + webhook can race).
 */
const fulfillPayment = async (payment, razorpayPaymentId, razorpaySignature = null) => {
  if (payment.status === PAYMENT_STATUS.SUCCESS) return;
  if (!payment.items?.length) {
    throw new AppError("Payment has no items to unlock", 409, "PAYMENT_EMPTY");
  }

  try {
    await Purchase.bulkWrite(
      payment.items.map((item) => ({
        updateOne: {
          filter: { userId: payment.userId, photoId: item.photoId },
          update: {
            $setOnInsert: {
              userId: payment.userId,
              eventId: payment.eventId,
              photographerId: payment.photographerId,
              purchaseType: PURCHASE_TYPE.PHOTO,
              photoId: item.photoId,
              paymentId: payment._id,
              amountPaid: item.amount, // paise
              platformFee: item.fee || 0,
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  } catch (err) {
    const onlyDuplicates = err?.writeErrors?.length && err.writeErrors.every((e) => e.code === 11000);
    if (err?.code !== 11000 && !onlyDuplicates) throw err;
  }

  await Payment.updateOne(
    { _id: payment._id, status: { $ne: PAYMENT_STATUS.SUCCESS } },
    { $set: { status: PAYMENT_STATUS.SUCCESS, razorpayPaymentId, razorpaySignature } }
  );
};

export const createOrder = asyncHandler(async (req, res) => {
  const { eventId, purchaseType, photoId, album, photographerId: requestedPhotographerId } = req.body;

  const [event, membership] = await Promise.all([
    Event.findById(eventId).select("status expiryDate"),
    EventParticipant.exists({ eventId, userId: req.user.id }),
  ]);
  if (!event) throw new AppError("Event not found", 404, "EVENT_NOT_FOUND");
  if (!membership) throw new AppError("You must join this event before buying photos", 403, "NOT_EVENT_MEMBER");
  if (event.status !== EVENT_STATUS.ACTIVE || event.expiryDate < new Date()) {
    throw new AppError("This event has expired, so new purchases are disabled", 403, "EVENT_EXPIRED");
  }

  let items = [];
  let photographerId = null;
  let resolvedPhotoId = null;
  let resolvedAlbum = null;

  if (purchaseType === PURCHASE_TYPE.PHOTO) {
    if (!photoId) throw new AppError("photoId is required for photo purchases", 400, "PHOTO_ID_REQUIRED");

    const photo = await Photo.findOne({ _id: photoId, eventId });
    if (!photo) throw new AppError("Photo not found", 404, "PHOTO_NOT_FOUND");
    if (!photo.isPaid || Number(photo.price) <= 0) throw new AppError("This photo is free — no purchase needed", 400, "PHOTO_NOT_PAID");
    if (photo.uploaderId.toString() === req.user.id) throw new AppError("You can't buy your own photo", 400, "OWN_PHOTO");

    const alreadyPurchased = await Purchase.exists({ userId: req.user.id, photoId: photo._id });
    if (alreadyPurchased) throw new AppError("You already own this photo", 409, "ALREADY_PURCHASED");

    items = [{ photoId: photo._id, amount: toPaise(photo.price) }];
    photographerId = photo.uploaderId;
    resolvedPhotoId = photo._id;
  } else {
    if (!album) throw new AppError("album is required for album purchases", 400, "ALBUM_REQUIRED");
    if (!requestedPhotographerId) throw new AppError("photographerId is required for album purchases", 400, "PHOTOGRAPHER_REQUIRED");
    if (requestedPhotographerId === req.user.id) throw new AppError("You can't buy your own photos", 400, "OWN_PHOTO");

    const ownedPhotoIds = await Purchase.find({ userId: req.user.id, eventId }).distinct("photoId");
    const photos = await Photo.find({
      eventId,
      album,
      uploaderId: requestedPhotographerId,
      isPaid: true,
      price: { $gt: 0 },
      _id: { $nin: ownedPhotoIds },
    });
    if (!photos.length) throw new AppError("Nothing left to buy from this photographer in this album", 404, "NO_PAID_PHOTOS");

    items = photos.map((p) => ({ photoId: p._id, amount: toPaise(p.price) }));
    photographerId = requestedPhotographerId;
    resolvedAlbum = album;
  }

  // Snapshot the platform fee per item at order time
  items = items.map((i) => ({ ...i, fee: feeFor(i.amount) }));
  const amountInPaise = items.reduce((sum, i) => sum + i.amount, 0);
  const platformFee = items.reduce((sum, i) => sum + i.fee, 0);
  if (amountInPaise < 100) throw new AppError("Amount must be at least ₹1", 400, "INVALID_AMOUNT");

  // We can only take money if we know how to pay the photographer
  const photographer = await User.findById(photographerId).select("isActive upiId");
  if (!photographer?.isActive || !photographer.upiId) {
    throw new AppError(
      "This photographer hasn't added a UPI ID yet, so their photos can't be purchased",
      409,
      "PHOTOGRAPHER_NO_UPI"
    );
  }

  const order = await createRazorpayOrder({
    amountInPaise,
    notes: { eventId: String(eventId), buyerId: String(req.user.id) },
  });

  const payment = await Payment.create({
    userId: req.user.id,
    eventId,
    purchaseType,
    photoId: resolvedPhotoId,
    albumId: resolvedAlbum,
    photographerId,
    items,
    platformFee,
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
  if (payment.status === PAYMENT_STATUS.SUCCESS) {
    return res.status(200).json({ success: true, message: "Payment already verified, content unlocked" });
  }

  const isValid = verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!isValid) throw new AppError("Payment signature verification failed", 400, "INVALID_SIGNATURE");

  let rzpPayment;
  try {
    rzpPayment = await fetchRazorpayPayment(razorpay_payment_id);
  } catch {
    throw new AppError("Could not confirm the payment with Razorpay, please retry", 502, "RAZORPAY_UNAVAILABLE");
  }
  if (
    rzpPayment.order_id !== payment.razorpayOrderId ||
    rzpPayment.amount !== payment.amount ||
    rzpPayment.currency !== "INR"
  ) {
    throw new AppError("Payment details do not match this order", 400, "PAYMENT_MISMATCH");
  }
  if (rzpPayment.status !== "captured") {
    await Payment.updateOne({ _id: payment._id }, { $set: { razorpayPaymentId: razorpay_payment_id } });
    return res.status(202).json({ success: true, pending: true, message: "Payment received, unlocking shortly" });
  }

  await fulfillPayment(payment, razorpay_payment_id, razorpay_signature);
  res.status(200).json({ success: true, message: "Payment verified, content unlocked" });
});

/** Razorpay webhook: mounted before auth with a RAW body parser (see app.js). */
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.get("x-razorpay-signature");
  const raw = req.body;

  if (!Buffer.isBuffer(raw) || !signature || !verifyWebhookSignature(raw, signature)) {
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }

  const event = JSON.parse(raw.toString("utf8"));

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const entity = event.payload?.payment?.entity;
    if (entity?.order_id && entity.status === "captured") {
      const payment = await Payment.findOne({ razorpayOrderId: entity.order_id });
      if (payment && entity.amount === payment.amount && entity.currency === "INR") {
        await fulfillPayment(payment, entity.id);
      }
    }
  }

  res.status(200).json({ success: true });
});

// ---------- Photographer: save the UPI ID we'll pay them on ----------

export const getMyUpi = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("upiId");
  res.status(200).json({ success: true, data: { upiId: user?.upiId || null } });
});

export const saveMyUpi = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $set: { upiId: req.body.upiId } });
  res.status(200).json({ success: true, data: { upiId: req.body.upiId } });
});

// ---------- Admin: who is owed what, and mark as paid ----------

export const adminListPendingPayouts = asyncHandler(async (req, res) => {
  const rows = await Purchase.aggregate([
    { $match: { $expr: { $not: [IS_PAID_OUT] } } },
    { $group: { _id: "$photographerId", net: { $sum: NET }, sales: { $sum: 1 } } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "u" } },
    { $unwind: "$u" },
    {
      $project: {
        photographerId: "$_id",
        name: "$u.name",
        email: "$u.email",
        upiId: "$u.upiId",
        sales: 1,
        amount: { $divide: ["$net", 100] }, // rupees
      },
    },
    { $sort: { amount: -1 } },
  ]);

  res.status(200).json({ success: true, data: { payouts: rows } });
});

export const adminMarkPaid = asyncHandler(async (req, res) => {
  const { photographerId } = req.params;
  const { reference } = req.body;

  if (!mongoose.isValidObjectId(photographerId)) {
    throw new AppError("Invalid photographer id", 400, "INVALID_ID");
  }
  const photographer = await User.findById(photographerId).select("upiId");
  if (!photographer) throw new AppError("Photographer not found", 404, "USER_NOT_FOUND");

  // Claim all unpaid purchases first, then total them up. Race-safe: a purchase
  // can only be claimed by one payout because the filter requires payoutId: null.
  const payout = await Payout.create({
    photographerId,
    upiId: photographer.upiId,
    amount: 0,
    reference,
    paidBy: req.user.id,
  });

  const result = await Purchase.updateMany(
    { photographerId, payoutId: null },
    { $set: { payoutId: payout._id } }
  );

  if (result.modifiedCount === 0) {
    await Payout.deleteOne({ _id: payout._id });
    throw new AppError("Nothing pending for this photographer", 409, "NOTHING_PENDING");
  }

  const [sum] = await Purchase.aggregate([
    { $match: { payoutId: payout._id } },
    { $group: { _id: null, net: { $sum: NET } } },
  ]);
  payout.amount = sum?.net || 0;
  await payout.save();

  res.status(200).json({ success: true, data: { amount: payout.amount / 100, sales: result.modifiedCount } });
});

// ---------- Buyer / photographer views ----------

export const listMyPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ userId: req.user.id })
    .populate("photoId")
    .populate("eventId", "title")
    .populate("photographerId", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: { purchases } });
});

export const getMyEarnings = asyncHandler(async (req, res) => {
  const photographerId = new mongoose.Types.ObjectId(req.user.id);

  const byEvent = await Purchase.aggregate([
    { $match: { photographerId } },
    { $group: { _id: "$eventId", net: { $sum: NET }, totalSales: { $sum: 1 } } },
    { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "event" } },
    { $unwind: "$event" },
    { $project: { eventTitle: "$event.title", totalEarnings: { $divide: ["$net", 100] }, totalSales: 1 } },
  ]);

  const [totals] = await Purchase.aggregate([
    { $match: { photographerId } },
    {
      $group: {
        _id: null,
        earned: { $sum: NET },
        paidOut: { $sum: { $cond: [IS_PAID_OUT, NET, 0] } },
      },
    },
  ]);

  const grandTotal = (totals?.earned || 0) / 100;
  const paidOut = (totals?.paidOut || 0) / 100;

  res.status(200).json({
    success: true,
    data: { byEvent, grandTotal, paidOut, pending: grandTotal - paidOut },
  });
});

export const getMySales = asyncHandler(async (req, res) => {
  const photographerId = new mongoose.Types.ObjectId(req.user.id);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

  const [rows, total, totalsAgg, me] = await Promise.all([
    Purchase.find({ photographerId })
      .sort({ purchasedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "name avatarUrl")
      .populate("photoId", "thumbnailUrl")
      .populate("eventId", "title")
      .lean(),
    Purchase.countDocuments({ photographerId }),
    Purchase.aggregate([
      { $match: { photographerId } },
      {
        $group: {
          _id: null,
          earned: { $sum: NET },
          paidOut: { $sum: { $cond: [IS_PAID_OUT, NET, 0] } },
          buyers: { $addToSet: "$userId" },
        },
      },
    ]),
    User.findById(req.user.id).select("upiId"),
  ]);

  const t = totalsAgg[0] || { earned: 0, paidOut: 0, buyers: [] };

  res.status(200).json({
    success: true,
    data: {
      summary: {
        earned: t.earned / 100,
        paidOut: t.paidOut / 100,
        pending: (t.earned - t.paidOut) / 100,
        sales: total,
        buyers: t.buyers.length,
      },
      hasUpi: Boolean(me?.upiId),
      pagination: { page, pages: Math.max(Math.ceil(total / limit), 1), total },
      sales: rows.map((s) => ({
        id: s._id,
        buyer: { name: s.userId?.name || "Deleted user", avatarUrl: s.userId?.avatarUrl || null },
        photoThumbnail: s.photoId?.thumbnailUrl || null,
        eventTitle: s.eventId?.title || "Event",
        amount: (s.amountPaid - (s.platformFee || 0)) / 100, // what the photographer earns
        paidOut: Boolean(s.payoutId),
        purchasedAt: s.purchasedAt,
      })),
    },
  });
});

export const getPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ razorpayOrderId: req.params.orderId, userId: req.user.id });
  if (!payment) throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");

  // The browser told us about a payment that wasn't captured yet: re-check with
  // Razorpay so the buyer gets unlocked even if the webhook is slow or missing.
  if (payment.status === PAYMENT_STATUS.PENDING && payment.razorpayPaymentId) {
    try {
      const rzp = await fetchRazorpayPayment(payment.razorpayPaymentId);
      if (
        rzp.order_id === payment.razorpayOrderId &&
        rzp.amount === payment.amount &&
        rzp.currency === "INR" &&
        rzp.status === "captured"
      ) {
        await fulfillPayment(payment, payment.razorpayPaymentId);
        return res.status(200).json({ success: true, data: { status: PAYMENT_STATUS.SUCCESS } });
      }
    } catch {
      // Razorpay unreachable: fall through and report what we know
    }
  }

  res.status(200).json({ success: true, data: { status: payment.status } });
});