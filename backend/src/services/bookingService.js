const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Venue = require("../models/Venue");
const Notification = require("../models/Notification");
const availabilityService = require("./availabilityService");
const { parseCampusDate } = availabilityService;

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function campusToday() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

async function submitBookingRequest(user, input, { resubmittedFrom = null, notificationType = "BOOKING_SUBMITTED" } = {}) {
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
  } = input || {};

  if (typeof venueSlug !== "string" || !venueSlug.trim()) fail(400, "Venue is required");
  if (typeof eventTitle !== "string" || eventTitle.trim().length < 3 || eventTitle.trim().length > 160) {
    fail(400, "Event title must be between 3 and 160 characters");
  }
  if (typeof department !== "string" || !department.trim() || department.trim().length > 120) {
    fail(400, "Department or organization is required");
  }
  if (!parseCampusDate(eventDate) || eventDate < campusToday()) {
    fail(400, "Event date must be today or a future date in YYYY-MM-DD format");
  }
  if (typeof slotKey !== "string" || !slotKey.trim()) fail(400, "A configured time slot is required");
  if (!Number.isInteger(expectedAttendees) || expectedAttendees < 1 || expectedAttendees > 100000) {
    fail(400, "Expected attendees must be a whole number between 1 and 100000");
  }
  if (typeof eventDescription !== "string" || eventDescription.trim().length < 10 || eventDescription.trim().length > 4000) {
    fail(400, "Event description must be between 10 and 4000 characters");
  }
  if (!Array.isArray(facilitiesRequested) || facilitiesRequested.some((item) => typeof item !== "string")) {
    fail(400, "Requested facilities must be a list of facility names");
  }
  if (typeof additionalRequirements !== "string" || additionalRequirements.length > 2000) {
    fail(400, "Additional requirements must be 2000 characters or fewer");
  }

  const session = await mongoose.startSession();
  let booking;
  try {
    await session.withTransaction(async () => {
      const venue = await Venue.findOne({ slug: venueSlug.trim().toLowerCase(), isActive: true })
        .session(session)
        .lean();
      if (!venue) fail(404, "Venue not found");

      // Share the approval lock so a concurrent submit and approval recheck each other.
      const lock = await Venue.updateOne(
        { _id: venue._id },
        { $inc: { approvalVersion: 1 } },
        { session }
      );
      if (!lock.matchedCount) fail(404, "Venue not found");

      const slot = venue.timeSlots.find((item) => item.key === slotKey);
      if (!slot) fail(400, "Select a time slot configured for this venue");
      if (venue.capacity != null && expectedAttendees > venue.capacity) {
        fail(400, "Expected attendees exceed this venue's configured capacity");
      }
      const supportedFacilities = new Set(venue.facilities.map((item) => item.trim().toLowerCase()));
      if (facilitiesRequested.some((item) => !supportedFacilities.has(item.trim().toLowerCase()))) {
        fail(400, "One or more requested facilities are not available at this venue");
      }

      const availability = await availabilityService.getVenueAvailability(venue.slug, eventDate, { session });
      const selectedSlot = availability?.slots.find((item) => item.key === slotKey);
      if (!selectedSlot || selectedSlot.status !== "AVAILABLE") {
        fail(409, "That slot is no longer available. Refresh availability and choose another slot.");
      }

      const created = await Booking.create([{
        venue: venue._id,
        requester: user._id,
        createdBy: user._id,
        source: "REQUEST",
        resubmittedFrom,
        eventTitle: eventTitle.trim(),
        department: department.trim(),
        eventDate: new Date(`${eventDate}T00:00:00.000Z`),
        slotKey: slot.key,
        expectedAttendees,
        eventDescription: eventDescription.trim(),
        facilitiesRequested: [...new Set(facilitiesRequested.map((item) => item.trim()))],
        additionalRequirements: additionalRequirements.trim(),
        status: "PENDING",
        history: [{ status: "PENDING", actor: user._id, reason: "Booking request submitted" }],
      }], { session });
      booking = created[0];
      await Notification.create([{
        recipient: user._id,
        type: notificationType,
        message: notificationType === "BOOKING_RESUBMITTED"
          ? `Your revised booking request for ${venue.name} has been submitted for approval.`
          : `Your booking request for ${venue.name} has been submitted for approval.`,
        relatedBooking: booking._id,
      }], { session });
    });
    return booking;
  } finally {
    await session.endSession();
  }
}

async function listUserBookings(userId) {
  return Booking.find({ requester: userId })
    .sort({ createdAt: -1 })
    .populate("venue", "name slug type timeSlots")
    .lean();
}

async function getUserBooking(userId, bookingId) {
  if (!/^[a-f\d]{24}$/i.test(bookingId)) return null;
  return Booking.findOne({ _id: bookingId, requester: userId })
    .populate("venue", "name slug type timeSlots")
    .lean();
}

module.exports = { submitBookingRequest, listUserBookings, getUserBooking };
