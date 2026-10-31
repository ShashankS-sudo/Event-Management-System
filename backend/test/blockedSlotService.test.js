const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Venue = require("../src/models/Venue");
const Booking = require("../src/models/Booking");
const Reservation = require("../src/models/Reservation");
const BlockedSlot = require("../src/models/BlockedSlot");
const Notification = require("../src/models/Notification");
const { createBlockedSlot, intervalFromInput } = require("../src/services/blockedSlotService");

const venueId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();
const venue = {
  _id: venueId,
  slug: "sample-venue",
  name: "Sample Venue",
  timeSlots: [{ key: "midday", startMinute: 660, endMinute: 780 }],
};

function setUp(t, { reservationConflicts = [], pending = [] } = {}) {
  const original = {
    startSession: mongoose.startSession,
    venueFindOne: Venue.findOne,
    venueUpdate: Venue.updateOne,
    reservationFind: Reservation.find,
    bookingFind: Booking.find,
    bookingUpdate: Booking.findOneAndUpdate,
    blockCreate: BlockedSlot.create,
    notificationCreate: Notification.create,
  };
  const autoRejected = [];
  const notifications = [];
  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });
  Venue.findOne = () => ({ session: async () => venue });
  Venue.updateOne = async () => ({ matchedCount: 1 });
  Reservation.find = () => ({
    populate() { return this; },
    session() { return this; },
    lean: async () => reservationConflicts,
  });
  Booking.find = () => ({ session: async () => pending });
  Booking.findOneAndUpdate = async (filter, update) => {
    const booking = pending.find((item) => String(item._id) === String(filter._id));
    if (!booking || booking.status !== "PENDING") return null;
    Object.assign(booking, update.$set);
    autoRejected.push(booking._id);
    return booking;
  };
  BlockedSlot.create = async (docs) => docs.map((doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc }));
  Notification.create = async (docs) => { notifications.push(...docs); return docs; };
  t.after(() => {
    mongoose.startSession = original.startSession;
    Venue.findOne = original.venueFindOne;
    Venue.updateOne = original.venueUpdate;
    Reservation.find = original.reservationFind;
    Booking.find = original.bookingFind;
    Booking.findOneAndUpdate = original.bookingUpdate;
    BlockedSlot.create = original.blockCreate;
    Notification.create = original.notificationCreate;
  });
  return { autoRejected, notifications };
}

const input = {
  venueSlug: "sample-venue",
  startDate: "2027-01-15",
  startMinute: 720,
  endDate: "2027-01-15",
  endMinute: 840,
  reason: "Maintenance work",
};

test("converts campus block times and rejects invalid intervals", () => {
  const interval = intervalFromInput(input);
  assert.equal(interval.startAt.toISOString(), "2027-01-15T06:30:00.000Z");
  assert.throws(() => intervalFromInput({ ...input, endMinute: 700 }), (error) => error.status === 400);
});

test("does not save a block that conflicts with an approved reservation", async (t) => {
  const conflict = { booking: { _id: "booking-id", eventTitle: "Approved Event" } };
  setUp(t, { reservationConflicts: [conflict] });
  await assert.rejects(
    createBlockedSlot({ _id: adminId }, input),
    (error) => error.status === 409 && error.details.conflicts[0].eventTitle === "Approved Event"
  );
});

test("creates a block under the venue lock and rejects overlapping pending requests", async (t) => {
  const pendingBooking = {
    _id: new mongoose.Types.ObjectId(),
    requester: new mongoose.Types.ObjectId(),
    eventDate: new Date("2027-01-15T00:00:00.000Z"),
    slotKey: "midday",
    status: "PENDING",
  };
  const { autoRejected, notifications } = setUp(t, { pending: [pendingBooking] });
  const result = await createBlockedSlot({ _id: adminId }, input);
  assert.equal(result.blockedSlot.reason, "Maintenance work");
  assert.deepEqual(result.autoRejectedIds, [pendingBooking._id]);
  assert.equal(pendingBooking.status, "REJECTED");
  assert.equal(notifications[0].type, "BOOKING_REJECTED");
});

test("requires valid dates and a block reason", async () => {
  await assert.rejects(
    createBlockedSlot({ _id: adminId }, { ...input, reason: "x" }),
    (error) => error.status === 400
  );
  await assert.rejects(
    createBlockedSlot({ _id: adminId }, { ...input, startDate: "2027-02-30" }),
    (error) => error.status === 400
  );
});
