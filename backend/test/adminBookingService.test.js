const test = require("node:test");
const assert = require("node:assert/strict");
const Booking = require("../src/models/Booking");
const Venue = require("../src/models/Venue");
const { listApproverBookings } = require("../src/services/adminBookingService");

function mockQueries(t, bookings = []) {
  const originals = { find: Booking.find, findOne: Venue.findOne };
  let bookingFilter;
  Booking.find = (filter) => {
    bookingFilter = filter;
    return {
      sort() { return this; },
      limit() { return this; },
      populate() { return this; },
      lean: async () => bookings,
    };
  };
  Venue.findOne = () => ({
    select() { return this; },
    lean: async () => ({ _id: "cse-venue-id" }),
  });
  t.after(() => {
    Booking.find = originals.find;
    Venue.findOne = originals.findOne;
  });
  return { getFilter: () => bookingFilter };
}

test("CSE HOD sees only CSE Seminar Hall requests", async (t) => {
  const { getFilter } = mockQueries(t, [{ _id: "booking-1" }]);
  const result = await listApproverBookings({ role: "HOD", department: "Computer Science and Engineering" });
  assert.deepEqual(result, [{ _id: "booking-1" }]);
  assert.deepEqual(getFilter(), { status: "PENDING", venue: "cse-venue-id" });
});

test("Principal and Admin queues are not narrowed by venue", async (t) => {
  const { getFilter } = mockQueries(t);
  await listApproverBookings({ role: "PRINCIPAL" }, "ALL");
  assert.deepEqual(getFilter(), {});
});

test("rejects invalid status filters and HODs outside CSE", async (t) => {
  mockQueries(t);
  await assert.rejects(
    listApproverBookings({ role: "ADMIN" }, "WAITING"),
    (error) => error.status === 400
  );
  await assert.rejects(
    listApproverBookings({ role: "HOD", department: "ECE" }),
    (error) => error.status === 403
  );
});
