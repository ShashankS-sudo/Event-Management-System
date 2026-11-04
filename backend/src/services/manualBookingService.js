const mongoose = require("mongoose");
const Venue = require("../models/Venue");
const Booking = require("../models/Booking");
const Reservation = require("../models/Reservation");
const BlockedSlot = require("../models/BlockedSlot");
const Notification = require("../models/Notification");
const availabilityService = require("./availabilityService");
const { parseCampusDate, campusMinuteToUtc } = availabilityService;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function campusToday() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function intervalFor(date, slot) {
  const dateString = date.toISOString().slice(0, 10);
  return {
    startAt: campusMinuteToUtc(dateString, slot.startMinute),
    endAt: campusMinuteToUtc(dateString, slot.endMinute + 60),
  };
}

async function createManualBooking(admin, input = {}) {
  const {
    venueSlug,
    eventTitle,
    department,
    eventDate,
    slotKey,
    expectedAttendees,
    eventDescription,
    facilitiesRequested = [],
    additionalRequirements = "",
  } = input;

  if (typeof venueSlug !== "string" || !venueSlug.trim()) fail(400, "Venue is required");
  if (typeof eventTitle !== "string" || eventTitle.trim().length < 3 || eventTitle.trim().length > 160) fail(400, "Event title must be between 3 and 160 characters");
  if (typeof department !== "string" || !department.trim() || department.trim().length > 120) fail(400, "Department or organization is required");
  if (!parseCampusDate(eventDate) || eventDate < campusToday()) fail(400, "Event date must be today or a future date in YYYY-MM-DD format");
  if (typeof slotKey !== "string" || !slotKey.trim()) fail(400, "A configured time slot is required");
  if (!Number.isInteger(expectedAttendees) || expectedAttendees < 1 || expectedAttendees > 100000) fail(400, "Expected attendees must be a whole number between 1 and 100000");
  if (typeof eventDescription !== "string" || eventDescription.trim().length < 10 || eventDescription.trim().length > 4000) fail(400, "Event description must be between 10 and 4000 characters");
  if (!Array.isArray(facilitiesRequested) || facilitiesRequested.some((item) => typeof item !== "string")) fail(400, "Requested facilities must be a list of facility names");
  if (typeof additionalRequirements !== "string" || additionalRequirements.length > 2000) fail(400, "Additional requirements must be 2000 characters or fewer");

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const venue = await Venue.findOne({ slug: venueSlug.trim().toLowerCase(), isActive: true }).session(session);
      if (!venue) fail(404, "Venue not found");
      const lock = await Venue.updateOne({ _id: venue._id }, { $inc: { approvalVersion: 1 } }, { session });
      if (!lock.matchedCount) fail(404, "Venue not found");

      const slot = venue.timeSlots.find((item) => item.key === slotKey);
      if (!slot) fail(400, "Select a time slot configured for this venue");
      if (venue.capacity != null && expectedAttendees > venue.capacity) fail(400, "Expected attendees exceed this venue's configured capacity");
      const supportedFacilities = new Set(venue.facilities.map((item) => item.trim().toLowerCase()));
      if (facilitiesRequested.some((item) => !supportedFacilities.has(item.trim().toLowerCase()))) fail(400, "One or more requested facilities are not available at this venue");

      const availability = await availabilityService.getVenueAvailability(venue.slug, eventDate, { session });
      if (availability?.slots.find((item) => item.key === slotKey)?.status !== "AVAILABLE") {
        fail(409, "That slot is not available for a manual reservation.");
      }

      const date = new Date(`${eventDate}T00:00:00.000Z`);
      const interval = intervalFor(date, slot);
      const [reservationConflict, blockConflict] = await Promise.all([
        Reservation.findOne({ venue: venue._id, startAt: { $lt: interval.endAt }, endAt: { $gt: interval.startAt } }).session(session),
        BlockedSlot.findOne({ venue: venue._id, isActive: true, startAt: { $lt: interval.endAt }, endAt: { $gt: interval.startAt } }).session(session),
      ]);
      if (reservationConflict || blockConflict) fail(409, "This manual reservation conflicts with a reservation or blocked period.");

      const decidedAt = new Date();
      const created = await Booking.create([{
        venue: venue._id,
        requester: null,
        createdBy: admin._id,
        source: "MANUAL",
        eventTitle: eventTitle.trim(),
        department: department.trim(),
        eventDate: date,
        slotKey: slot.key,
        expectedAttendees,
        eventDescription: eventDescription.trim(),
        facilitiesRequested: [...new Set(facilitiesRequested.map((item) => item.trim()))],
        additionalRequirements: additionalRequirements.trim(),
        status: "APPROVED",
        decidedBy: admin._id,
        decidedAt,
        history: [{ status: "APPROVED", actor: admin._id, reason: "Manual reservation created by administrator", changedAt: decidedAt }],
      }], { session });
      const manualBooking = created[0];

      await Reservation.create([{ venue: venue._id, booking: manualBooking._id, ...interval }], { session });

      const pending = await Booking.find({ venue: venue._id, status: "PENDING" }).session(session);
      const autoRejectedIds = [];
      const notifications = [];
      for (const candidate of pending) {
        const candidateSlot = venue.timeSlots.find((item) => item.key === candidate.slotKey);
        if (!candidateSlot) continue;
        const candidateDate = candidate.eventDate.toISOString().slice(0, 10);
        const startsAt = campusMinuteToUtc(candidateDate, candidateSlot.startMinute);
        const endsAt = campusMinuteToUtc(candidateDate, candidateSlot.endMinute);
        if (!overlaps(interval.startAt, interval.endAt, startsAt, endsAt)) continue;
        const reason = "Conflicts with an administrator-created manual reservation";
        const rejected = await Booking.findOneAndUpdate(
          { _id: candidate._id, status: "PENDING" },
          {
            $set: { status: "REJECTED", rejectionReason: reason, decidedBy: admin._id, decidedAt },
            $push: { history: { status: "REJECTED", actor: admin._id, reason, changedAt: decidedAt } },
          },
          { returnDocument: "after", runValidators: true, session }
        );
        if (rejected) {
          autoRejectedIds.push(rejected._id);
          notifications.push({
            recipient: candidate.requester,
            type: "BOOKING_CONFLICT_REJECTED",
            message: `Your booking request for ${venue.name} was rejected because an administrator created a conflicting reservation.`,
            relatedBooking: candidate._id,
          });
        }
      }
      if (notifications.length) await Notification.create(notifications, { session, ordered: true });
      result = { booking: manualBooking, autoRejectedIds };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = { createManualBooking, intervalFor };
