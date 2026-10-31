const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Venue = require("../src/models/Venue");
const Booking = require("../src/models/Booking");
const venueAdminService = require("../src/services/venueAdminService");

const validInput = {
  name: "CSE Seminar Hall", slug: "CSE-Seminar-Hall", type: "Seminar Hall",
  description: "A confirmed example venue description.", department: "CSE", location: "Block A", capacity: 120,
  facilities: ["Projector", "Projector", "Sound System"],
  timeSlots: [{ key: "morning", label: "Morning", startMinute: 540, endMinute: 720 }],
  operatingHours: [{ dayOfWeek: 1, isClosed: false, opensAtMinute: 480, closesAtMinute: 1020 }],
};

test("normalizes venue input and removes duplicate facilities", () => {
  const venue = venueAdminService.validateVenueInput(validInput);
  assert.equal(venue.slug, "cse-seminar-hall");
  assert.deepEqual(venue.facilities, ["Projector", "Sound System"]);
  assert.equal(venue.capacity, 120);
  assert.equal(venue.isActive, true);
});

test("allows blank capacity but rejects invalid slugs and capacity", () => {
  assert.equal(venueAdminService.validateVenueInput({ ...validInput, capacity: null }).capacity, null);
  assert.throws(() => venueAdminService.validateVenueInput({ ...validInput, slug: "bad slug" }), (error) => error.status === 400);
  assert.throws(() => venueAdminService.validateVenueInput({ ...validInput, capacity: 1.5 }), (error) => error.status === 400);
});

test("creates a venue from validated fields", async (t) => {
  const original = Venue.create;
  let saved;
  Venue.create = async (input) => { saved = input; return { _id: "venue-id", ...input }; };
  t.after(() => { Venue.create = original; });
  const result = await venueAdminService.createVenue(validInput);
  assert.equal(result._id, "venue-id");
  assert.equal(saved.slug, "cse-seminar-hall");
});

function setUpUpdate(t, bookings) {
  const originals = { startSession: mongoose.startSession, venueUpdate: Venue.updateOne, venueFind: Venue.findById, venueFindUpdate: Venue.findByIdAndUpdate, bookingFind: Booking.find };
  const current = { _id: new mongoose.Types.ObjectId(), slug: "cse-seminar-hall", timeSlots: [{ key: "morning", startMinute: 540, endMinute: 720 }], operatingHours: [{ dayOfWeek: 1, isClosed: false, opensAtMinute: 480, closesAtMinute: 1020 }] };
  mongoose.startSession = async () => ({ withTransaction: async (callback) => callback(), endSession: async () => {} });
  Venue.updateOne = async () => ({ matchedCount: 1 });
  Venue.findById = () => ({ session() { return this; }, lean: async () => current });
  Booking.find = () => ({ session() { return this; }, lean: async () => bookings });
  Venue.findByIdAndUpdate = (_id, changes) => ({ lean: async () => ({ ...current, ...changes }) });
  t.after(() => { mongoose.startSession = originals.startSession; Venue.updateOne = originals.venueUpdate; Venue.findById = originals.venueFind; Venue.findByIdAndUpdate = originals.venueFindUpdate; Booking.find = originals.bookingFind; });
  return current;
}

test("allows safe descriptive venue updates while bookings exist", async (t) => {
  const current = setUpUpdate(t, [{ status: "PENDING", expectedAttendees: 50, facilitiesRequested: ["Projector"] }]);
  const input = { ...validInput, slug: current.slug, capacity: 100, timeSlots: [{ key: "morning", label: "Morning", startMinute: 540, endMinute: 720 }], operatingHours: current.operatingHours, facilities: ["Projector"] };
  const venue = await venueAdminService.updateVenue(String(current._id), input);
  assert.equal(venue.name, "CSE Seminar Hall");
});

test("protects configured booking schedules from changes with active bookings", async (t) => {
  const current = setUpUpdate(t, [{ status: "APPROVED", expectedAttendees: 50, facilitiesRequested: [] }]);
  const input = { ...validInput, slug: current.slug, capacity: 100, timeSlots: [{ key: "morning", label: "Morning", startMinute: 550, endMinute: 720 }], operatingHours: current.operatingHours };
  await assert.rejects(venueAdminService.updateVenue(String(current._id), input), (error) => error.status === 409 && /cannot change/.test(error.message));
});
