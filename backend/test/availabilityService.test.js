const test = require("node:test");
const assert = require("node:assert/strict");
const Venue = require("../src/models/Venue");
const Reservation = require("../src/models/Reservation");
const BlockedSlot = require("../src/models/BlockedSlot");
const { getVenueAvailability, campusMinuteToUtc } = require("../src/services/availabilityService");

test("parses campus dates and rejects invalid calendar dates", async () => {
  const { parseCampusDate } = require("../src/services/availabilityService");
  assert.equal(parseCampusDate("2026-12-15").weekday, 2);
  assert.equal(parseCampusDate("2026-02-30"), null);
  await assert.rejects(getVenueAvailability("venue", "bad-date"), (error) => error.status === 400);
});

test("returns configured slots with reservation, block, and closed status", async () => {
  const originals = {
    findOne: Venue.findOne,
    reservationFind: Reservation.find,
    blockFind: BlockedSlot.find,
  };
  const venueId = "venue-id";
  Venue.findOne = () => ({
    lean: async () => ({
      _id: venueId,
      slug: "sample-venue",
      name: "Sample Venue",
      operatingHours: [{ dayOfWeek: 2, isClosed: false, opensAtMinute: 540, closesAtMinute: 1020 }],
      timeSlots: [
        { key: "morning", label: "9–11", startMinute: 540, endMinute: 660 },
        { key: "midday", label: "11–13", startMinute: 660, endMinute: 780 },
        { key: "afternoon", label: "13–15", startMinute: 780, endMinute: 900 },
        { key: "evening", label: "17–19", startMinute: 1020, endMinute: 1140 },
      ],
    }),
  });
  Reservation.find = () => ({
    lean: async () => [{
      startAt: campusMinuteToUtc("2026-12-15", 540),
      endAt: campusMinuteToUtc("2026-12-15", 720),
    }],
  });
  BlockedSlot.find = () => ({
    lean: async () => [{
      startAt: campusMinuteToUtc("2026-12-15", 780),
      endAt: campusMinuteToUtc("2026-12-15", 900),
    }],
  });

  try {
    const result = await getVenueAvailability("sample-venue", "2026-12-15");
    assert.deepEqual(result.slots.map((slot) => slot.status), [
      "BOOKED", "BOOKED", "BLOCKED", "CLOSED",
    ]);
  } finally {
    Venue.findOne = originals.findOne;
    Reservation.find = originals.reservationFind;
    BlockedSlot.find = originals.blockFind;
  }
});

test("availability intervals use the campus UTC offset", () => {
  assert.equal(campusMinuteToUtc("2026-12-15", 540).toISOString(), "2026-12-15T03:30:00.000Z");
});
