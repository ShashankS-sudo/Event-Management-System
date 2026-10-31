const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Venue = require("../src/models/Venue");
const Booking = require("../src/models/Booking");
const Reservation = require("../src/models/Reservation");
const BlockedSlot = require("../src/models/BlockedSlot");
const Notification = require("../src/models/Notification");
const availabilityService = require("../src/services/availabilityService");
const { createManualBooking } = require("../src/services/manualBookingService");

const admin = { _id: new mongoose.Types.ObjectId() };
const venue = {
  _id: new mongoose.Types.ObjectId(),
  slug: "sample-venue",
  name: "Sample Venue",
  capacity: 100,
  facilities: ["Projector"],
  timeSlots: [{ key: "morning", startMinute: 540, endMinute: 660 }],
};
const input = {
  venueSlug: "sample-venue",
  eventTitle: "College Orientation",
  department: "Administration",
  eventDate: "2099-12-15",
  slotKey: "morning",
  expectedAttendees: 80,
  eventDescription: "Orientation program for new students.",
  facilitiesRequested: ["Projector"],
};

function setUp(t, { availabilityStatus = "AVAILABLE", blockConflict = null, pending = [] } = {}) {
  const original = {
    startSession: mongoose.startSession,
    venueFind: Venue.findOne,
    venueUpdate: Venue.updateOne,
    availability: availabilityService.getVenueAvailability,
    reservationFind: Reservation.findOne,
    reservationCreate: Reservation.create,
    blockFind: BlockedSlot.findOne,
    bookingCreate: Booking.create,
    bookingFind: Booking.find,
    bookingUpdate: Booking.findOneAndUpdate,
    notificationCreate: Notification.create,
  };
  const reservations = [];
  const autoRejected = [];
  const notifications = [];
  mongoose.startSession = async () => ({ withTransaction: async (callback) => callback(), endSession: async () => {} });
  Venue.findOne = () => ({ session: async () => venue });
  Venue.updateOne = async () => ({ matchedCount: 1 });
  availabilityService.getVenueAvailability = async () => ({ slots: [{ key: "morning", status: availabilityStatus }] });
  Reservation.findOne = () => ({ session: async () => null });
  Reservation.create = async (docs) => { reservations.push(...docs); return docs; };
  BlockedSlot.findOne = () => ({ session: async () => blockConflict });
  Booking.create = async (docs) => docs.map((doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc }));
  Booking.find = () => ({ session: async () => pending });
  Booking.findOneAndUpdate = async (filter, update) => {
    const candidate = pending.find((item) => String(item._id) === String(filter._id));
    if (!candidate || candidate.status !== "PENDING") return null;
    Object.assign(candidate, update.$set);
    autoRejected.push(candidate._id);
    return candidate;
  };
  Notification.create = async (docs) => { notifications.push(...docs); return docs; };
  t.after(() => {
    mongoose.startSession = original.startSession;
    Venue.findOne = original.venueFind;
    Venue.updateOne = original.venueUpdate;
    availabilityService.getVenueAvailability = original.availability;
    Reservation.findOne = original.reservationFind;
    Reservation.create = original.reservationCreate;
    BlockedSlot.findOne = original.blockFind;
    Booking.create = original.bookingCreate;
    Booking.find = original.bookingFind;
    Booking.findOneAndUpdate = original.bookingUpdate;
    Notification.create = original.notificationCreate;
  });
  return { reservations, autoRejected, notifications };
}

test("creates a manual reservation with ADMIN ownership and a one-hour buffer", async (t) => {
  const { reservations } = setUp(t);
  const result = await createManualBooking(admin, input);
  assert.equal(result.booking.source, "MANUAL");
  assert.equal(result.booking.requester, null);
  assert.equal(result.booking.createdBy, admin._id);
  assert.equal(result.booking.status, "APPROVED");
  assert.equal(reservations[0].startAt.toISOString(), "2099-12-15T03:30:00.000Z");
  assert.equal(reservations[0].endAt.toISOString(), "2099-12-15T06:30:00.000Z");
});

test("rejects a manual reservation when the slot is blocked or unavailable", async (t) => {
  setUp(t, { availabilityStatus: "BLOCKED" });
  await assert.rejects(createManualBooking(admin, input), (error) => error.status === 409);
});

test("manual reservation rejects and notifies pending conflicts", async (t) => {
  const candidate = {
    _id: new mongoose.Types.ObjectId(),
    requester: new mongoose.Types.ObjectId(),
    eventDate: new Date("2099-12-15T00:00:00.000Z"),
    slotKey: "morning",
    status: "PENDING",
  };
  const { autoRejected, notifications } = setUp(t, { pending: [candidate] });
  const result = await createManualBooking(admin, input);
  assert.deepEqual(result.autoRejectedIds, [candidate._id]);
  assert.deepEqual(autoRejected, [candidate._id]);
  assert.equal(notifications[0].type, "BOOKING_CONFLICT_REJECTED");
});
