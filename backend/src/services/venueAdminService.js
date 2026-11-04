const mongoose = require("mongoose");
const Venue = require("../models/Venue");
const Booking = require("../models/Booking");

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function validateVenueInput(input = {}) {
  const { name, slug, type } = input;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120) fail(400, "Venue name must be between 2 and 120 characters");
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim().toLowerCase())) fail(400, "Use a lowercase venue slug with letters, numbers, and hyphens");
  if (typeof type !== "string" || !type.trim() || type.trim().length > 80) fail(400, "Venue type is required and must be 80 characters or fewer");
  if (input.capacity != null && (!Number.isInteger(input.capacity) || input.capacity < 1)) fail(400, "Capacity must be a positive whole number or blank");
  for (const field of ["facilities", "timeSlots", "operatingHours"]) if (!Array.isArray(input[field])) fail(400, `${field} must be a list`);
  for (const item of input.facilities) if (typeof item !== "string" || !item.trim() || item.length > 120) fail(400, "Each facility must be a non-empty name up to 120 characters");
  return {
    name: name.trim(), slug: slug.trim().toLowerCase(), type: type.trim(),
    description: typeof input.description === "string" ? input.description.trim() : "",
    department: typeof input.department === "string" && input.department.trim() ? input.department.trim() : null,
    location: typeof input.location === "string" && input.location.trim() ? input.location.trim() : null,
    capacity: input.capacity == null ? null : input.capacity,
    facilities: [...new Set(input.facilities.map((item) => item.trim()))],
    timeSlots: input.timeSlots,
    operatingHours: input.operatingHours,
    isActive: input.isActive !== false,
  };
}

async function listManagedVenues() {
  return Venue.find({}).sort({ name: 1 }).lean();
}

async function createVenue(input) {
  try { return await Venue.create(validateVenueInput(input)); }
  catch (error) {
    if (error.code === 11000) fail(409, "A venue with that slug already exists");
    if (error.name === "ValidationError") fail(400, error.message);
    throw error;
  }
}

async function updateVenue(venueId, input) {
  if (!mongoose.isValidObjectId(venueId)) fail(400, "Invalid venue reference");
  const changes = validateVenueInput(input);
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const lock = await Venue.updateOne({ _id: venueId }, { $inc: { approvalVersion: 1 } }, { session });
      if (!lock.matchedCount) fail(404, "Venue not found");
      const current = await Venue.findById(venueId).session(session).lean();
      const activeBookings = await Booking.find({ venue: venueId, status: { $in: ["PENDING", "APPROVED"] } }).session(session).lean();
      if (activeBookings.length) {
        if (changes.slug !== current.slug) fail(409, "Venue slug cannot change while pending or approved bookings exist");
        const currentSchedule = JSON.stringify({ slots: current.timeSlots.map(({ key, startMinute, endMinute }) => ({ key, startMinute, endMinute })), hours: current.operatingHours });
        const updatedSchedule = JSON.stringify({ slots: changes.timeSlots.map(({ key, startMinute, endMinute }) => ({ key, startMinute, endMinute })), hours: changes.operatingHours });
        if (currentSchedule !== updatedSchedule) fail(409, "Time slots and operating hours cannot change while pending or approved bookings exist");
        const facilitySet = new Set(changes.facilities.map((facility) => facility.toLowerCase()));
        for (const booking of activeBookings) {
          if (changes.capacity != null && booking.expectedAttendees > changes.capacity) fail(409, "Capacity cannot be reduced below an existing pending or approved booking");
          if (booking.facilitiesRequested.some((facility) => !facilitySet.has(facility.toLowerCase()))) fail(409, "A requested facility is used by an existing pending or approved booking");
          if (booking.status === "PENDING" && !changes.isActive) fail(409, "Venue cannot be deactivated while pending requests need a decision");
        }
      }
      updated = await Venue.findByIdAndUpdate(venueId, changes, { returnDocument: "after", runValidators: true, session }).lean();
      if (!updated) fail(404, "Venue not found");
    });
    return updated;
  } catch (error) {
    if (error.code === 11000) fail(409, "A venue with that slug already exists");
    if (error.name === "ValidationError") fail(400, error.message);
    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = { validateVenueInput, listManagedVenues, createVenue, updateVenue };
