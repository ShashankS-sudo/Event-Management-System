const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Booking = require("../src/models/Booking");

const ids = {
  venue: new mongoose.Types.ObjectId(),
  user: new mongoose.Types.ObjectId(),
};

function validRequest(overrides = {}) {
  return new Booking({
    venue: ids.venue,
    requester: ids.user,
    createdBy: ids.user,
    eventTitle: "Engineering Seminar",
    department: "Computer Science",
    eventDate: new Date("2027-01-15T00:00:00.000Z"),
    slotKey: "morning",
    expectedAttendees: 80,
    eventDescription: "A technical seminar for students and staff.",
    ...overrides,
  });
}

test("validates a customer request and defaults it to pending", async () => {
  const booking = validRequest();
  await booking.validate();
  assert.equal(booking.status, "PENDING");
  assert.equal(booking.source, "REQUEST");
});

test("allows multiple requests for the same venue, date, and slot", async () => {
  await validRequest().validate();
  await validRequest({ requester: new mongoose.Types.ObjectId() }).validate();
  assert.equal(Booking.schema.indexes().some(([keys, options]) =>
    keys.venue && keys.eventDate && keys.slotKey && options.unique), false);
});

test("requires a rejection reason and keeps manual records distinct from requests", async () => {
  const rejected = validRequest({ status: "REJECTED" });
  await assert.rejects(rejected.validate(), (error) => Boolean(error.errors.rejectionReason));

  const manual = validRequest({
    source: "MANUAL",
    requester: null,
    status: "APPROVED",
    history: [{ status: "APPROVED", actor: ids.user }],
  });
  await manual.validate();
  assert.equal(manual.requester, null);
  assert.equal(manual.history.length, 1);
});

test("rejects inconsistent source ownership and invalid booking fields", async () => {
  const booking = validRequest({ source: "MANUAL", expectedAttendees: 0 });
  await assert.rejects(booking.validate(), (error) => {
    assert.ok(error.errors.requester);
    assert.ok(error.errors.expectedAttendees);
    return true;
  });
});
