const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Venue = require("../models/Venue");
const Reservation = require("../models/Reservation");
const BlockedSlot = require("../models/BlockedSlot");
const Notification = require("../models/Notification");
const { campusMinuteToUtc } = require("./availabilityService");

const CLEANING_BUFFER_MINUTES = 60;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function canDecide(user, venue) {
  if (user.role === "ADMIN" || user.role === "PRINCIPAL") return true;
  if (user.role !== "HOD" || venue.slug !== "cse-seminar-hall") return false;
  const department = (user.department || "").trim().toUpperCase();
  return ["CSE", "COMPUTER SCIENCE AND ENGINEERING", "COMPUTER SCIENCE & ENGINEERING"].includes(department);
}

function getInterval(date, slot, addBuffer = false) {
  const dateString = date.toISOString().slice(0, 10);
  return {
    startAt: campusMinuteToUtc(dateString, slot.startMinute),
    endAt: campusMinuteToUtc(dateString, slot.endMinute + (addBuffer ? CLEANING_BUFFER_MINUTES : 0)),
  };
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

async function applyDecision(bookingId, approver, decision, reason = "") {
  if (!mongoose.isValidObjectId(bookingId)) fail(400, "Invalid booking reference");
  if (!["APPROVED", "REJECTED"].includes(decision)) fail(400, "Decision must be APPROVED or REJECTED");
  if (decision === "REJECTED" && (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000)) {
    fail(400, "A rejection reason of 3 to 1000 characters is required");
  }

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) fail(404, "Booking not found");
      if (booking.status !== "PENDING") fail(409, "Only pending booking requests can be decided");
      if (booking.source !== "REQUEST") fail(400, "Manual reservations cannot be decided as customer requests");

      // Every decision writes this existing venue document inside the transaction.
      // Concurrent decisions for the same venue therefore conflict and retry against fresh state.
      const lock = await Venue.updateOne(
        { _id: booking.venue },
        { $inc: { approvalVersion: 1 } },
        { session }
      );
      if (!lock.matchedCount) fail(404, "Venue not found");

      const venue = await Venue.findById(booking.venue).session(session);
      if (!venue || !canDecide(approver, venue)) fail(403, "You cannot decide bookings for this venue");

      const decidedAt = new Date();
      const cleanReason = decision === "REJECTED" ? reason.trim() : "";
      const updatedBooking = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "PENDING" },
        {
          $set: {
            status: decision,
            rejectionReason: cleanReason,
            decidedBy: approver._id,
            decidedAt,
          },
          $push: {
            history: { status: decision, actor: approver._id, reason: cleanReason, changedAt: decidedAt },
          },
        },
        { new: true, runValidators: true, session }
      );
      if (!updatedBooking) fail(409, "This booking has already been decided");

      const autoRejectedIds = [];
      const notifications = [{
        recipient: booking.requester,
        type: decision === "APPROVED" ? "BOOKING_APPROVED" : "BOOKING_REJECTED",
        message: decision === "APPROVED"
          ? `Your booking request for ${venue.name} was approved.`
          : `Your booking request for ${venue.name} was rejected: ${cleanReason}`,
        relatedBooking: booking._id,
      }];
      if (decision === "APPROVED") {
        const slot = venue.timeSlots.find((item) => item.key === booking.slotKey);
        if (!slot) fail(409, "The requested time slot is no longer configured");
        const interval = getInterval(booking.eventDate, slot, true);

        const [reservationConflict, blockConflict] = await Promise.all([
          Reservation.findOne({
            venue: venue._id,
            startAt: { $lt: interval.endAt },
            endAt: { $gt: interval.startAt },
          }).session(session),
          BlockedSlot.findOne({
            venue: venue._id,
            isActive: true,
            startAt: { $lt: interval.endAt },
            endAt: { $gt: interval.startAt },
          }).session(session),
        ]);
        if (reservationConflict || blockConflict) {
          fail(409, "The requested period conflicts with a reservation or blocked period");
        }

        await Reservation.create(
          [{ venue: venue._id, booking: booking._id, ...interval }],
          { session }
        );

        const pending = await Booking.find({
          venue: venue._id,
          status: "PENDING",
          _id: { $ne: booking._id },
        }).session(session);
        for (const candidate of pending) {
          const pendingSlot = venue.timeSlots.find((item) => item.key === candidate.slotKey);
          if (!pendingSlot) continue;
          const candidateInterval = getInterval(candidate.eventDate, pendingSlot);
          if (!overlaps(interval.startAt, interval.endAt, candidateInterval.startAt, candidateInterval.endAt)) continue;

          const autoReason = "Conflicts with another booking approved for this venue and time";
          const rejected = await Booking.findOneAndUpdate(
            { _id: candidate._id, status: "PENDING" },
            {
              $set: { status: "REJECTED", rejectionReason: autoReason, decidedBy: approver._id, decidedAt },
              $push: {
                history: { status: "REJECTED", actor: approver._id, reason: autoReason, changedAt: decidedAt },
              },
            },
            { new: true, runValidators: true, session }
          );
          if (rejected) {
            autoRejectedIds.push(rejected._id);
            notifications.push({
              recipient: candidate.requester,
              type: "BOOKING_CONFLICT_REJECTED",
              message: `Your booking request for ${venue.name} was rejected because another request was approved for a conflicting time.`,
              relatedBooking: candidate._id,
            });
          }
        }
      }

      await Notification.create(notifications, { session });

      result = { booking: updatedBooking, autoRejectedIds };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { applyDecision, canDecide, getInterval, CLEANING_BUFFER_MINUTES };
