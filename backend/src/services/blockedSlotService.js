const mongoose = require("mongoose");
const Venue = require("../models/Venue");
const Booking = require("../models/Booking");
const Reservation = require("../models/Reservation");
const BlockedSlot = require("../models/BlockedSlot");
const Notification = require("../models/Notification");
const { campusMinuteToUtc, parseCampusDate } = require("./availabilityService");

function fail(status, message, details) {
  const error = new Error(message);
  error.status = status;
  if (details) error.details = details;
  throw error;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function intervalFromInput(input) {
  const { startDate, startMinute, endDate, endMinute } = input;
  if (!parseCampusDate(startDate) || !parseCampusDate(endDate)) {
    fail(400, "Block dates must be valid dates in YYYY-MM-DD format");
  }
  if (!Number.isInteger(startMinute) || startMinute < 0 || startMinute > 1439 ||
      !Number.isInteger(endMinute) || endMinute < 0 || endMinute > 1440) {
    fail(400, "Block start and end times must use minutes from midnight");
  }
  const startAt = campusMinuteToUtc(startDate, startMinute);
  const endAt = campusMinuteToUtc(endDate, endMinute);
  if (startAt >= endAt) fail(400, "Blocked period end must be after its start");
  return { startAt, endAt };
}

async function createBlockedSlot(admin, input = {}) {
  const venueSlug = typeof input.venueSlug === "string" ? input.venueSlug.trim().toLowerCase() : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!venueSlug) fail(400, "Venue is required");
  if (reason.length < 3 || reason.length > 500) fail(400, "A reason of 3 to 500 characters is required");
  const interval = intervalFromInput(input);

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const venue = await Venue.findOne({ slug: venueSlug, isActive: true }).session(session);
      if (!venue) fail(404, "Venue not found");

      const lock = await Venue.updateOne({ _id: venue._id }, { $inc: { approvalVersion: 1 } }, { session });
      if (!lock.matchedCount) fail(404, "Venue not found");

      const reservations = await Reservation.find({
        venue: venue._id,
        startAt: { $lt: interval.endAt },
        endAt: { $gt: interval.startAt },
      }).populate("booking", "eventTitle").session(session).lean();
      if (reservations.length) {
        fail(409, "This blocked period conflicts with approved reservations.", {
          conflicts: reservations.map((reservation) => ({
            bookingId: reservation.booking?._id,
            eventTitle: reservation.booking?.eventTitle || "Approved reservation",
            startAt: reservation.startAt,
            endAt: reservation.endAt,
          })),
        });
      }

      const block = await BlockedSlot.create([{
        venue: venue._id,
        ...interval,
        reason,
        createdBy: admin._id,
      }], { session });

      const pending = await Booking.find({ venue: venue._id, status: "PENDING" }).session(session);
      const autoRejectedIds = [];
      const notifications = [];
      for (const booking of pending) {
        const slot = venue.timeSlots.find((item) => item.key === booking.slotKey);
        if (!slot) continue;
        const eventDate = booking.eventDate.toISOString().slice(0, 10);
        const requestStart = campusMinuteToUtc(eventDate, slot.startMinute);
        const requestEnd = campusMinuteToUtc(eventDate, slot.endMinute);
        if (!overlaps(interval.startAt, interval.endAt, requestStart, requestEnd)) continue;

        const decidedAt = new Date();
        const rejectionReason = `Unavailable due to an administrative block: ${reason}`;
        const rejected = await Booking.findOneAndUpdate(
          { _id: booking._id, status: "PENDING" },
          {
            $set: { status: "REJECTED", rejectionReason, decidedBy: admin._id, decidedAt },
            $push: {
              history: { status: "REJECTED", actor: admin._id, reason: rejectionReason, changedAt: decidedAt },
            },
          },
          { new: true, runValidators: true, session }
        );
        if (rejected) {
          autoRejectedIds.push(rejected._id);
          notifications.push({
            recipient: booking.requester,
            type: "BOOKING_REJECTED",
            message: `Your request for ${venue.name} was rejected because the venue has been blocked: ${reason}`,
            relatedBooking: booking._id,
          });
        }
      }
      if (notifications.length) await Notification.create(notifications, { session });
      result = { blockedSlot: block[0], autoRejectedIds };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function listActiveBlockedSlots() {
  return BlockedSlot.find({ isActive: true })
    .sort({ startAt: 1 })
    .populate("venue", "name slug")
    .populate("createdBy", "name")
    .lean();
}

async function removeBlockedSlot(admin, blockedSlotId) {
  if (!mongoose.isValidObjectId(blockedSlotId)) fail(400, "Invalid blocked period reference");
  const session = await mongoose.startSession();
  let removed;
  try {
    await session.withTransaction(async () => {
      const block = await BlockedSlot.findOne({ _id: blockedSlotId, isActive: true }).session(session);
      if (!block) fail(404, "Blocked period not found");
      const lock = await Venue.updateOne({ _id: block.venue }, { $inc: { approvalVersion: 1 } }, { session });
      if (!lock.matchedCount) fail(404, "Venue not found");
      removed = await BlockedSlot.findOneAndUpdate(
        { _id: block._id, isActive: true },
        { $set: { isActive: false, removedBy: admin._id, removedAt: new Date() } },
        { new: true, session, runValidators: true }
      );
    });
    return removed;
  } finally {
    await session.endSession();
  }
}

module.exports = { createBlockedSlot, listActiveBlockedSlots, removeBlockedSlot, intervalFromInput };
