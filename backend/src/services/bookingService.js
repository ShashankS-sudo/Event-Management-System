const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Venue = require("../models/Venue");
const Notification = require("../models/Notification");
const EmailOutbox = require("../models/EmailOutbox");
const availabilityService = require("./availabilityService");
const { parseCampusDate } = availabilityService;
const { BOOKING_MINIMUM_NOTICE_DAYS } = require("../config/bookingPolicy");
const { bookingEmail } = require("./emailOutboxService");

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function campusToday() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

function minimumBookingDate() {
  const [year, month, day] = campusToday().split("-").map(Number);
  const minimum = new Date(Date.UTC(year, month - 1, day + BOOKING_MINIMUM_NOTICE_DAYS));
  return minimum.toISOString().slice(0, 10);
}

async function submitBookingRequest(user, input, { resubmittedFrom = null, notificationType = "BOOKING_SUBMITTED" } = {}) {
  const {
    venueSlug,
    eventTitle,
    department,
    contactDetails,
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
  if (!contactDetails || typeof contactDetails !== "object") fail(400, "Contact person and organization details are required");
  const contactName = typeof contactDetails.name === "string" ? contactDetails.name.trim() : "";
  const contactPhone = typeof contactDetails.phone === "string" ? contactDetails.phone.trim() : "";
  const contactEmail = typeof contactDetails.email === "string" ? contactDetails.email.trim().toLowerCase() : "";
  const contactOrganization = typeof contactDetails.organization === "string" ? contactDetails.organization.trim() : "";
  if (contactName.length < 2 || contactName.length > 120) fail(400, "Contact name must contain 2 to 120 characters");
  if (!/^\+?[\d\s()-]{7,30}$/.test(contactPhone) || contactPhone.replace(/\D/g, "").length < 7) fail(400, "Enter a valid contact phone number");
  if (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) fail(400, "Enter a valid contact email address");
  if (contactOrganization.length < 2 || contactOrganization.length > 120) fail(400, "Organization name must contain 2 to 120 characters");
  if (!parseCampusDate(eventDate) || eventDate < minimumBookingDate()) {
    fail(400, `Bookings must be submitted at least ${BOOKING_MINIMUM_NOTICE_DAYS} days before the event`);
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
        contactDetails: { name: contactName, phone: contactPhone, email: contactEmail, organization: contactOrganization },
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
      await EmailOutbox.create([bookingEmail(booking, venue, notificationType)], { session, ordered: true });
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
