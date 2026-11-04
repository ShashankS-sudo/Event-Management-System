require("dotenv").config();

const mongoose = require("mongoose");
const Venue = require("../src/models/Venue");
const Booking = require("../src/models/Booking");

function dailyHours(closesAtMinute) {
  return Array.from({ length: 7 }, (_item, dayOfWeek) => ({
    dayOfWeek,
    isClosed: false,
    opensAtMinute: 510,
    closesAtMinute,
  }));
}

function formatTime(minute) {
  const hour = Math.floor(minute / 60);
  const minutes = minute % 60;
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function hourlyRanges(closesAtMinute) {
  const slots = [];
  for (let startMinute = 510; startMinute + 60 <= closesAtMinute; startMinute += 60) {
    for (let endMinute = startMinute + 60; endMinute <= closesAtMinute; endMinute += 60) {
      const key = `${String(startMinute).padStart(4, "0")}-${String(endMinute).padStart(4, "0")}`;
      slots.push({ key, label: `${formatTime(startMinute)} – ${formatTime(endMinute)}`, startMinute, endMinute });
    }
  }
  return slots;
}

const venues = [
  { name: "Seminar Hall", slug: "cse-seminar-hall", type: "Seminar Hall", capacity: 100, location: "SJBIT Campus", facilities: [], description: "A campus seminar space for academic events and meetings.", operatingHours: dailyHours(990), timeSlots: hourlyRanges(990) },
  { name: "Basketball Ground", slug: "basketball-ground", type: "Sports Ground", capacity: 150, location: "SJBIT Campus", facilities: [], description: "A campus outdoor space for sports utilization.", operatingHours: dailyHours(1230), timeSlots: hourlyRanges(1230) },
  { name: "Cricket Ground", slug: "cricket-ground", type: "Sports Ground", capacity: 5000, location: "SJBIT Campus", facilities: [], description: "A campus ground for sports utilization.", operatingHours: dailyHours(1230), timeSlots: hourlyRanges(1230) },
  { name: "Auditorium", slug: "auditorium", type: "Auditorium", capacity: 1500, location: "SJBIT Campus", facilities: [], description: "A campus auditorium for academic and community events.", operatingHours: dailyHours(1230), timeSlots: hourlyRanges(1230) },
];

async function seedVenues() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured in backend/.env");
  await mongoose.connect(process.env.MONGODB_URI);
  let inserted = 0;
  let alreadyPresent = 0;
  try {
    const existingVenues = await Venue.find({ slug: { $in: venues.map((venue) => venue.slug) } }).select("_id slug timeSlots").lean();
    for (const existing of existingVenues) {
      const target = venues.find((venue) => venue.slug === existing.slug);
      const targetKeys = new Set(target.timeSlots.map((slot) => slot.key));
      const activeBookings = await Booking.find({ venue: existing._id, status: { $in: ["PENDING", "APPROVED"] } }).select("slotKey eventTitle").lean();
      const incompatible = activeBookings.filter((booking) => !targetKeys.has(booking.slotKey));
      if (incompatible.length) {
        throw new Error(`Cannot change the ${existing.slug} schedule while active bookings use previous slots: ${incompatible.map((booking) => booking.eventTitle).join(", ")}`);
      }
    }
    for (const venue of venues) {
      const result = await Venue.updateOne(
        { slug: venue.slug },
        { $set: { ...venue, isActive: true } },
        { upsert: true, runValidators: true }
      );
      if (result.upsertedCount) inserted += 1;
      else alreadyPresent += 1;
    }
    const confirmed = await Venue.find({ slug: { $in: venues.map((venue) => venue.slug) } }).select("name slug isActive capacity location facilities operatingHours timeSlots").lean();
    if (confirmed.length !== venues.length || confirmed.some((venue) => !venue.isActive || venue.operatingHours.length !== 7 || venue.timeSlots.length === 0)) throw new Error("Venue seed verification failed");
    process.stdout.write(`Venue seed verified: ${inserted} added, ${alreadyPresent} already present.\n`);
    for (const venue of confirmed) process.stdout.write(`- ${venue.name} (${venue.slug}), capacity=${venue.capacity || "unconfirmed"}, open 8:30 AM–${venue.slug === "cse-seminar-hall" ? "4:30 PM" : "8:30 PM"} daily, ${venue.timeSlots.length} hourly ranges\n`);
  } finally {
    await mongoose.disconnect();
  }
}

seedVenues().catch(async () => {
  process.stderr.write("Could not seed the venue records. Check the database connection and venue index state.\n");
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  process.exitCode = 1;
});
