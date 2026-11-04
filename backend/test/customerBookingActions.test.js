const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Booking = require("../src/models/Booking");
const Venue = require("../src/models/Venue");
const Reservation = require("../src/models/Reservation");
const Notification = require("../src/models/Notification");
const EmailOutbox = require("../src/models/EmailOutbox");
const User = require("../src/models/User");
const bookingService = require("../src/services/bookingService");
const { cancelCustomerBooking, resubmitRejectedBooking, requestCancellationException } = require("../src/services/customerBookingActions");

const customer = { _id: new mongoose.Types.ObjectId() };
const venueId = new mongoose.Types.ObjectId();
const bookingId = new mongoose.Types.ObjectId();
const venue = { _id: venueId, name: "Sample Venue", timeSlots: [{ key: "morning", startMinute: 540, endMinute: 660 }] };

function setUpCancellation(t, { status = "APPROVED", eventDate } = {}) {
  const originals = {
    startSession: mongoose.startSession,
    bookingFind: Booking.findOne,
    bookingUpdate: Booking.findOneAndUpdate,
    venueUpdate: Venue.updateOne,
    venueFind: Venue.findById,
    reservationDelete: Reservation.deleteOne,
    notificationCreate: Notification.create,
    outboxCreate: EmailOutbox.create,
    userFind: User.find,
  };
  const current = { _id: bookingId, requester: customer._id, venue: venueId, slotKey: "morning", eventDate: eventDate || new Date("2099-12-15T00:00:00.000Z"), status, source: "REQUEST" };
  let released = false;
  const notifications = [];
  mongoose.startSession = async () => ({ withTransaction: async (callback) => callback(), endSession: async () => {} });
  Booking.findOne = () => ({ session: async () => current });
  Booking.findOneAndUpdate = async (_filter, update) => { Object.assign(current, update.$set); return current; };
  Venue.updateOne = async () => ({ matchedCount: 1 });
  Venue.findById = () => ({ session: async () => venue });
  Reservation.deleteOne = async () => { released = true; return { deletedCount: 1 }; };
  Notification.create = async (docs) => { notifications.push(...docs); return docs; };
  EmailOutbox.create = async (docs) => docs;
  User.find = () => ({ select() { return this; }, session() { return this; }, lean: async () => [] });
  t.after(() => {
    mongoose.startSession = originals.startSession;
    Booking.findOne = originals.bookingFind;
    Booking.findOneAndUpdate = originals.bookingUpdate;
    Venue.updateOne = originals.venueUpdate;
    Venue.findById = originals.venueFind;
    Reservation.deleteOne = originals.reservationDelete;
    Notification.create = originals.notificationCreate;
    EmailOutbox.create = originals.outboxCreate;
    User.find = originals.userFind;
  });
  return { current, get released() { return released; }, notifications };
}

test("submits an approved booking cancellation for management review without releasing its reservation", async (t) => {
  const state = setUpCancellation(t);
  const booking = await cancelCustomerBooking(customer, String(bookingId));
  assert.equal(booking.status, "APPROVED");
  assert.equal(booking.cancellationException.status, "PENDING");
  assert.equal(state.released, false);
  assert.equal(state.notifications.at(-1).type, "CANCELLATION_EXCEPTION");
});

test("submits a pending booking cancellation for management review", async (t) => {
  const state = setUpCancellation(t, { status: "PENDING" });
  const booking = await cancelCustomerBooking(customer, String(bookingId));
  assert.equal(booking.status, "PENDING");
  assert.equal(booking.cancellationException.status, "PENDING");
  assert.equal(state.released, false);
});

test("rejects cancellation requests inside the four-day cutoff", async (t) => {
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(futureDate);
  const state = setUpCancellation(t, { eventDate: new Date(`${date}T00:00:00.000Z`) });
  await assert.rejects(cancelCustomerBooking(customer, String(bookingId)), (error) => error.status === 409 && /at least 4 days/.test(error.message));
  assert.equal(state.current.status, "APPROVED");
});

test("resubmission creates a new version linked to the rejected original", async (t) => {
  const originalFind = Booking.findOne;
  const originalSubmit = bookingService.submitBookingRequest;
  const original = { _id: bookingId, venue: { slug: "sample-venue" } };
  let query;
  let submitted;
  Booking.findOne = (filter) => {
    query = filter;
    return { populate() { return this; }, lean: async () => original };
  };
  bookingService.submitBookingRequest = async (_user, input, options) => {
    submitted = { input, options };
    return { _id: new mongoose.Types.ObjectId(), status: "PENDING", resubmittedFrom: options.resubmittedFrom };
  };
  t.after(() => {
    Booking.findOne = originalFind;
    bookingService.submitBookingRequest = originalSubmit;
  });

  const result = await resubmitRejectedBooking(customer, String(bookingId), { eventTitle: "Updated Event" });
  assert.equal(query.requester, customer._id);
  assert.equal(query.status, "REJECTED");
  assert.equal(submitted.input.venueSlug, "sample-venue");
  assert.equal(submitted.options.resubmittedFrom, bookingId);
  assert.equal(submitted.options.notificationType, "BOOKING_RESUBMITTED");
  assert.equal(result.status, "PENDING");
});

test("requests cancellation within the four-day lead and notifies approvers", async (t) => {
  const originals = { startSession: mongoose.startSession, bookingFind: Booking.findOne, bookingUpdate: Booking.findOneAndUpdate, venueFind: Venue.findById, userFind: User.find, notificationCreate: Notification.create, outboxCreate: EmailOutbox.create };
  const current = { _id: bookingId, requester: customer._id, venue: venueId, slotKey: "morning", eventDate: new Date(Date.now() + 20 * 86400000), status: "APPROVED", source: "REQUEST", cancellationException: { status: "NONE" } };
  const approver = { _id: new mongoose.Types.ObjectId(), role: "ADMIN" };
  const notifications = [];
  mongoose.startSession = async () => ({ withTransaction: async (callback) => callback(), endSession: async () => {} });
  Booking.findOne = () => ({ session: async () => current });
  Booking.findOneAndUpdate = async (_filter, update) => { current.cancellationException = update.$set.cancellationException; return current; };
  Venue.findById = () => ({ session: async () => venue });
  User.find = () => ({ select() { return this; }, session() { return this; }, lean: async () => [approver] });
  Notification.create = async (docs) => { notifications.push(...docs); return docs; };
  EmailOutbox.create = async (docs) => docs;
  t.after(() => { mongoose.startSession = originals.startSession; Booking.findOne = originals.bookingFind; Booking.findOneAndUpdate = originals.bookingUpdate; Venue.findById = originals.venueFind; User.find = originals.userFind; Notification.create = originals.notificationCreate; EmailOutbox.create = originals.outboxCreate; });
  const result = await requestCancellationException(customer, String(bookingId), "The event has been postponed unexpectedly.");
  assert.equal(result.cancellationException.status, "PENDING");
  assert.equal(notifications.length, 2);
  assert.ok(notifications.every((item) => item.type === "CANCELLATION_EXCEPTION"));
});
