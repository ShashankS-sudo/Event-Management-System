const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Booking = require("../src/models/Booking");
const Venue = require("../src/models/Venue");
const Reservation = require("../src/models/Reservation");
const BlockedSlot = require("../src/models/BlockedSlot");
const Notification = require("../src/models/Notification");
const { applyDecision, canDecide, getInterval } = require("../src/services/approvalService");

const bookingId = new mongoose.Types.ObjectId();
const venueId = new mongoose.Types.ObjectId();
const approverId = new mongoose.Types.ObjectId();
const venue = {
  _id: venueId,
  slug: "cse-seminar-hall",
  timeSlots: [{ key: "morning", startMinute: 540, endMinute: 660 }, { key: "midday", startMinute: 660, endMinute: 780 }],
};
const pendingBooking = () => ({
  _id: bookingId,
  venue: venueId,
  eventDate: new Date("2027-01-15T00:00:00.000Z"),
  slotKey: "morning",
  status: "PENDING",
  source: "REQUEST",
});

function setUpMocks(t, { reservationConflict = null, blockConflict = null, pending = [] } = {}) {
  const originals = {
    startSession: mongoose.startSession,
    findById: Booking.findById,
    findOneAndUpdate: Booking.findOneAndUpdate,
    find: Booking.find,
    venueUpdateOne: Venue.updateOne,
    venueFindById: Venue.findById,
    reservationFindOne: Reservation.findOne,
    reservationCreate: Reservation.create,
    blockFindOne: BlockedSlot.findOne,
    notificationCreate: Notification.create,
  };
  const stored = pendingBooking();
  const reserved = [];
  const rejected = [];
  const notifications = [];
  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });
  Booking.findById = () => ({ session: async () => stored });
  Booking.findOneAndUpdate = async (filter, update) => {
    const doc = filter._id.equals?.(bookingId) || String(filter._id) === String(bookingId)
      ? stored
      : pending.find((item) => String(item._id) === String(filter._id));
    if (!doc || doc.status !== "PENDING") return null;
    Object.assign(doc, update.$set);
    if (update.$push?.history) doc.history = [...(doc.history || []), update.$push.history];
    if (doc !== stored) rejected.push(doc._id);
    return doc;
  };
  Booking.find = () => ({ session: async () => pending });
  Venue.updateOne = async () => ({ matchedCount: 1 });
  Venue.findById = () => ({ session: async () => venue });
  Reservation.findOne = () => ({ session: async () => reservationConflict });
  Reservation.create = async (docs) => { reserved.push(...docs); return docs; };
  BlockedSlot.findOne = () => ({ session: async () => blockConflict });
  Notification.create = async (docs) => { notifications.push(...docs); return docs; };
  t.after(() => {
    mongoose.startSession = originals.startSession;
    Booking.findById = originals.findById;
    Booking.findOneAndUpdate = originals.findOneAndUpdate;
    Booking.find = originals.find;
    Venue.updateOne = originals.venueUpdateOne;
    Venue.findById = originals.venueFindById;
    Reservation.findOne = originals.reservationFindOne;
    Reservation.create = originals.reservationCreate;
    BlockedSlot.findOne = originals.blockFindOne;
    Notification.create = originals.notificationCreate;
  });
  return { stored, reserved, rejected, notifications };
}

test("approval authority is restricted to the configured role and venue", () => {
  assert.equal(canDecide({ role: "PRINCIPAL" }, venue), true);
  assert.equal(canDecide({ role: "ADMIN" }, venue), true);
  assert.equal(canDecide({ role: "HOD", department: "CSE" }, venue), true);
  assert.equal(canDecide({ role: "HOD", department: "ECE" }, venue), false);
  assert.equal(canDecide({ role: "CUSTOMER" }, venue), false);
  assert.equal(canDecide({ role: "HOD", department: "CSE" }, { slug: "auditorium" }), false);
});

test("approval reserves the event plus one-hour cleaning buffer", async (t) => {
  const { reserved, notifications } = setUpMocks(t);
  const result = await applyDecision(String(bookingId), { _id: approverId, role: "HOD", department: "CSE" }, "APPROVED");
  assert.equal(result.booking.status, "APPROVED");
  assert.equal(reserved.length, 1);
  assert.equal(reserved[0].startAt.toISOString(), "2027-01-15T03:30:00.000Z");
  assert.equal(reserved[0].endAt.toISOString(), "2027-01-15T06:30:00.000Z");
  assert.equal(notifications[0].type, "BOOKING_APPROVED");
});

test("approval rejects overlapping pending requests and records history", async (t) => {
  const conflict = { _id: new mongoose.Types.ObjectId(), eventDate: new Date("2027-01-15T00:00:00.000Z"), slotKey: "midday", status: "PENDING" };
  const { rejected, notifications } = setUpMocks(t, { pending: [conflict] });
  const result = await applyDecision(String(bookingId), { _id: approverId, role: "PRINCIPAL" }, "APPROVED");
  assert.deepEqual(result.autoRejectedIds, [conflict._id]);
  assert.deepEqual(rejected, [conflict._id]);
  assert.match(conflict.rejectionReason, /Conflicts with another booking/);
  assert.ok(notifications.some((notification) => notification.type === "BOOKING_CONFLICT_REJECTED"));
});

test("does not approve when an existing reservation or block conflicts", async (t) => {
  setUpMocks(t, { blockConflict: { _id: "blocked" } });
  await assert.rejects(
    applyDecision(String(bookingId), { _id: approverId, role: "PRINCIPAL" }, "APPROVED"),
    (error) => error.status === 409
  );
});

test("requires a reason for rejection and records the reason", async (t) => {
  await assert.rejects(
    applyDecision(String(bookingId), { _id: approverId, role: "PRINCIPAL" }, "REJECTED"),
    (error) => error.status === 400
  );
  const { stored } = setUpMocks(t);
  const result = await applyDecision(String(bookingId), { _id: approverId, role: "PRINCIPAL" }, "REJECTED", "Venue unavailable");
  assert.equal(result.booking.rejectionReason, "Venue unavailable");
  assert.equal(stored.history.at(-1).status, "REJECTED");
});

test("computes intervals using campus time and the cleaning buffer", () => {
  const interval = getInterval(new Date("2027-01-15T00:00:00.000Z"), venue.timeSlots[0], true);
  assert.equal(interval.endAt.getTime() - interval.startAt.getTime(), 3 * 60 * 60 * 1000);
});
