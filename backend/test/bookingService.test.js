const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Booking = require("../src/models/Booking");
const Venue = require("../src/models/Venue");
const Notification = require("../src/models/Notification");
const availabilityService = require("../src/services/availabilityService");
const { submitBookingRequest } = require("../src/services/bookingService");

const user = { _id: new mongoose.Types.ObjectId() };
const input = {
  venueSlug: "sample-venue",
  eventTitle: "Engineering Seminar",
  department: "Computer Science",
  eventDate: "2099-12-15",
  slotKey: "morning",
  expectedAttendees: 80,
  eventDescription: "A technical seminar for students and staff.",
  facilitiesRequested: ["Projector"],
};

function withMocks(t, { availabilityStatus = "AVAILABLE", capacity = 100 } = {}) {
  const originals = {
    startSession: mongoose.startSession,
    findOne: Venue.findOne,
    venueUpdateOne: Venue.updateOne,
    create: Booking.create,
    notificationCreate: Notification.create,
    getAvailability: availabilityService.getVenueAvailability,
  };
  Venue.findOne = () => ({
    session() {
      return this;
    },
    lean: async () => ({
      _id: new mongoose.Types.ObjectId(),
      slug: "sample-venue",
      capacity,
      facilities: ["Projector"],
      timeSlots: [{ key: "morning" }],
    }),
  });
  Venue.updateOne = async () => ({ matchedCount: 1 });
  availabilityService.getVenueAvailability = async () => ({
    slots: [{ key: "morning", status: availabilityStatus }],
  });
  Booking.create = async (documents) => documents.map((data) => ({ _id: new mongoose.Types.ObjectId(), ...data }));
  const notifications = [];
  Notification.create = async (documents) => { notifications.push(...documents); return documents; };
  mongoose.startSession = async () => ({
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  });
  t.after(() => {
    mongoose.startSession = originals.startSession;
    Venue.findOne = originals.findOne;
    Venue.updateOne = originals.venueUpdateOne;
    Booking.create = originals.create;
    Notification.create = originals.notificationCreate;
    availabilityService.getVenueAvailability = originals.getAvailability;
  });
  return { notifications };
}

test("submits a pending customer request after rechecking availability", async (t) => {
  const { notifications } = withMocks(t);
  const booking = await submitBookingRequest(user, input);
  assert.equal(booking.status, "PENDING");
  assert.equal(booking.source, "REQUEST");
  assert.equal(booking.requester, user._id);
  assert.equal(booking.history[0].status, "PENDING");
  assert.equal(notifications[0].type, "BOOKING_SUBMITTED");
  assert.equal(notifications[0].recipient, user._id);
});

test("rejects unavailable slots and requests above configured capacity", async (t) => {
  withMocks(t, { availabilityStatus: "BLOCKED" });
  await assert.rejects(submitBookingRequest(user, input), (error) => error.status === 409);

  withMocks(t, { capacity: 50 });
  await assert.rejects(submitBookingRequest(user, input), (error) => error.status === 400);
});

test("validates event date and configured facility selections", async (t) => {
  withMocks(t);
  await assert.rejects(
    submitBookingRequest(user, { ...input, eventDate: "2099-02-30" }),
    (error) => error.status === 400
  );
  await assert.rejects(
    submitBookingRequest(user, { ...input, facilitiesRequested: ["Unsupported"] }),
    (error) => error.status === 400
  );
});
