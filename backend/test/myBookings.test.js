const test = require("node:test");
const assert = require("node:assert/strict");
const Booking = require("../src/models/Booking");
const { listUserBookings, getUserBooking } = require("../src/services/bookingService");

test("lists bookings scoped to the requesting user", async (t) => {
  const original = Booking.find;
  const userId = "user-id";
  const expected = [{ _id: "booking-id" }];
  let filter;
  Booking.find = (query) => {
    filter = query;
    return {
      sort() {
        return this;
      },
      populate() {
        return this;
      },
      lean: async () => expected,
    };
  };
  try {
    assert.deepEqual(await listUserBookings(userId), expected);
    assert.deepEqual(filter, { requester: userId });
  } finally {
    Booking.find = original;
  }
});

test("loads a booking only when both its id and owner match", async (t) => {
  const original = Booking.findOne;
  let filter;
  Booking.findOne = (query) => {
    filter = query;
    return {
      populate() {
        return this;
      },
      lean: async () => ({ _id: query._id, requester: query.requester }),
    };
  };
  try {
    const result = await getUserBooking("owner-id", "507f1f77bcf86cd799439011");
    assert.deepEqual(filter, { _id: "507f1f77bcf86cd799439011", requester: "owner-id" });
    assert.equal(result.requester, "owner-id");
    assert.equal(await getUserBooking("owner-id", "not-an-object-id"), null);
  } finally {
    Booking.findOne = original;
  }
});
