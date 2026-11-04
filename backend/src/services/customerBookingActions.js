const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Venue = require("../models/Venue");
const Reservation = require("../models/Reservation");
const Notification = require("../models/Notification");
const EmailOutbox = require("../models/EmailOutbox");
const User = require("../models/User");
const { campusMinuteToUtc } = require("./availabilityService");
const bookingService = require("./bookingService");
const { CANCELLATION_DEADLINE_DAYS } = require("../config/bookingPolicy");
const { bookingEmail } = require("./emailOutboxService");

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

async function cancelCustomerBooking(user, bookingId) {
  return requestCancellationException(user, bookingId, "Customer requested cancellation.");
}

async function resubmitRejectedBooking(user, bookingId, input = {}) {
  if (!mongoose.isValidObjectId(bookingId)) fail(400, "Invalid booking reference");
  const original = await Booking.findOne({
    _id: bookingId,
    requester: user._id,
    source: "REQUEST",
    status: "REJECTED",
  }).populate("venue", "slug").lean();
  if (!original) fail(404, "Rejected booking not found");

  const venueSlug = typeof input.venueSlug === "string" && input.venueSlug.trim()
    ? input.venueSlug
    : original.venue?.slug;
  const booking = await bookingService.submitBookingRequest(
    user,
    { ...input, venueSlug, contactDetails: input.contactDetails || original.contactDetails },
    { resubmittedFrom: original._id, notificationType: "BOOKING_RESUBMITTED" }
  );
  return booking;
}

async function requestCancellationException(user, bookingId, reason) {
  if (!mongoose.isValidObjectId(bookingId)) fail(400, "Invalid booking reference");
  if (typeof reason !== "string" || reason.trim().length < 10 || reason.trim().length > 1000) fail(400, "Please provide a reason between 10 and 1000 characters");
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({ _id: bookingId, requester: user._id }).session(session);
      if (!booking || booking.source !== "REQUEST" || !["PENDING", "APPROVED"].includes(booking.status)) fail(404, "Eligible booking not found");
      if (booking.cancellationException?.status === "PENDING") fail(409, "A cancellation exception is already awaiting review");
      if (["APPROVED", "REJECTED"].includes(booking.cancellationException?.status)) fail(409, "A decision has already been made on this exception request");
      const venue = await Venue.findById(booking.venue).session(session);
      const slot = venue?.timeSlots.find((item) => item.key === booking.slotKey);
      if (!slot) fail(409, "The booking time slot is no longer configured");
      const eventDate = booking.eventDate.toISOString().slice(0, 10);
      const startsAt = campusMinuteToUtc(eventDate, slot.startMinute);
      const deadline = startsAt.getTime() - CANCELLATION_DEADLINE_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() > deadline) fail(409, `Cancellation requests must be submitted at least ${CANCELLATION_DEADLINE_DAYS} days before the event.`);
      const requestedAt = new Date();
      updated = await Booking.findOneAndUpdate({ _id: booking._id, "cancellationException.status": { $in: ["NONE", null] } }, {
        $set: { cancellationException: { status: "PENDING", reason: reason.trim(), requestedAt } },
      }, { returnDocument: "after", runValidators: true, session });
      if (!updated) fail(409, "An exception request was submitted concurrently");
      const approvers = await User.find({ isActive: true, role: { $in: ["ADMIN", "PRINCIPAL"] } }).select("_id role").session(session).lean();
      const notifications = approvers.map((approver) => ({ recipient: approver._id, type: "CANCELLATION_EXCEPTION", message: `A customer requested cancellation of ${venue.name}. Review the booking.`, relatedBooking: booking._id }));
      notifications.push({ recipient: user._id, type: "CANCELLATION_EXCEPTION", message: `Your cancellation request for ${venue.name} was sent for management review.`, relatedBooking: booking._id });
      await Notification.create(notifications, { session, ordered: true });
      await EmailOutbox.create([bookingEmail(updated, venue, "CANCELLATION_REQUESTED")], { session, ordered: true });
    });
    return updated;
  } finally { await session.endSession(); }
}

async function decideCancellationException(approver, bookingId, decision, decisionReason = "") {
  if (!mongoose.isValidObjectId(bookingId)) fail(400, "Invalid booking reference");
  if (!["APPROVED", "REJECTED"].includes(decision)) fail(400, "Decision must be APPROVED or REJECTED");
  if (decision === "REJECTED" && (typeof decisionReason !== "string" || decisionReason.trim().length < 3 || decisionReason.trim().length > 1000)) fail(400, "A rejection reason of 3 to 1000 characters is required");
  const approvalService = require("./approvalService");
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking || booking.cancellationException?.status !== "PENDING") fail(404, "Pending cancellation request not found");
      const lock = await Venue.updateOne({ _id: booking.venue }, { $inc: { approvalVersion: 1 } }, { session });
      if (!lock.matchedCount) fail(404, "Venue not found");
      const venue = await Venue.findById(booking.venue).session(session);
      if (!venue || !["ADMIN", "PRINCIPAL"].includes(approver.role) || !approvalService.canDecide(approver, venue)) fail(403, "Only management can decide cancellation requests");
      const decidedAt = new Date();
      updated = await Booking.findOneAndUpdate({ _id: booking._id, "cancellationException.status": "PENDING" }, { $set: {
        "cancellationException.status": decision,
        "cancellationException.decidedBy": approver._id,
        "cancellationException.decidedAt": decidedAt,
        "cancellationException.decisionReason": decision === "REJECTED" ? decisionReason.trim() : "",
        ...(decision === "APPROVED" ? { status: "CANCELLED", decidedBy: approver._id, decidedAt } : {}),
      }, ...(decision === "APPROVED" ? { $push: { history: { status: "CANCELLED", actor: approver._id, reason: "Cancellation request approved", changedAt: decidedAt } } } : {}) }, { returnDocument: "after", runValidators: true, session });
      if (!updated) fail(409, "The cancellation request was decided concurrently");
      if (decision === "APPROVED" && booking.status === "APPROVED") {
        const released = await Reservation.deleteOne({ booking: booking._id }, { session });
        if (!released.deletedCount) fail(409, "The approved reservation could not be released");
      }
      await Notification.create([{ recipient: booking.requester, type: "CANCELLATION_EXCEPTION", message: decision === "APPROVED" ? `Your cancellation request for ${venue.name} was approved.` : `Your cancellation request for ${venue.name} was declined: ${decisionReason.trim()}`, relatedBooking: booking._id }], { session, ordered: true });
    });
    return updated;
  } finally { await session.endSession(); }
}

module.exports = {
  cancelCustomerBooking,
  resubmitRejectedBooking,
  requestCancellationException,
  decideCancellationException,
};
