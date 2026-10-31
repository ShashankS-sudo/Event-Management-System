const test = require("node:test");
const assert = require("node:assert/strict");
const Venue = require("../src/models/Venue");

function validVenue(overrides = {}) {
  return new Venue({
    name: "Sample Venue",
    slug: "sample-venue",
    type: "Seminar Hall",
    ...overrides,
  });
}

test("accepts a venue without unconfirmed capacity or schedule details", async () => {
  const venue = validVenue();
  await venue.validate();
  assert.equal(venue.capacity, null);
  assert.deepEqual(venue.timeSlots, []);
  assert.deepEqual(venue.operatingHours, []);
});

test("rejects malformed slugs and capacities below one", async () => {
  const venue = validVenue({ slug: "Bad Slug", capacity: 0 });
  await assert.rejects(venue.validate(), (error) => {
    assert.ok(error.errors.slug);
    assert.ok(error.errors.capacity);
    return true;
  });
});

test("rejects duplicate slot keys", async () => {
  const venue = validVenue({
    timeSlots: [
      { key: "morning", label: "Morning", startMinute: 600, endMinute: 720 },
      { key: "morning", label: "Afternoon", startMinute: 800, endMinute: 900 },
    ],
  });
  await assert.rejects(venue.validate(), (error) => {
    assert.ok(error.errors.timeSlots);
    return true;
  });
});

test("rejects a time slot whose end is not after its start", async () => {
  const venue = validVenue({
    timeSlots: [
      { key: "invalid", label: "Invalid", startMinute: 800, endMinute: 700 },
    ],
  });
  await assert.rejects(venue.validate(), (error) => {
    assert.ok(error.errors["timeSlots.0.endMinute"]);
    return true;
  });
});

test("rejects duplicate operating days", async () => {
  const venue = validVenue({
    operatingHours: [
      { dayOfWeek: 1, opensAtMinute: 540, closesAtMinute: 1020 },
      { dayOfWeek: 1, opensAtMinute: 600, closesAtMinute: 900 },
    ],
  });
  await assert.rejects(venue.validate(), (error) => {
    assert.ok(error.errors.operatingHours);
    return true;
  });
});

test("rejects open days without valid hours", async () => {
  const venue = validVenue({
    operatingHours: [{ dayOfWeek: 1, opensAtMinute: 600, closesAtMinute: 500 }],
  });
  await assert.rejects(venue.validate(), (error) => {
    assert.ok(error.errors["operatingHours.0.closesAtMinute"]);
    return true;
  });
});
