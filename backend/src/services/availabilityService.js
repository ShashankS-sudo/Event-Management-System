const Venue = require("../models/Venue");
const Reservation = require("../models/Reservation");
const BlockedSlot = require("../models/BlockedSlot");

const CAMPUS_UTC_OFFSET_MINUTES = 330; // SJBIT campus time is Asia/Kolkata (UTC+05:30).

function parseCampusDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return { year, month, day, weekday: date.getUTCDay() };
}

function campusMinuteToUtc(dateString, minute) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, minute - CAMPUS_UTC_OFFSET_MINUTES));
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

async function getVenueAvailability(slug, dateString, { session } = {}) {
  const dateParts = parseCampusDate(dateString);
  if (!dateParts) {
    const error = new Error("Date must be a valid calendar date in YYYY-MM-DD format");
    error.status = 400;
    throw error;
  }

  let venueQuery = Venue.findOne({ slug, isActive: true });
  if (session) venueQuery = venueQuery.session(session);
  const venue = await venueQuery.lean();
  if (!venue) return null;

  const dayStart = campusMinuteToUtc(dateString, 0);
  const nextDate = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + 1));
  const nextDateString = nextDate.toISOString().slice(0, 10);
  const dayEnd = campusMinuteToUtc(nextDateString, 0);

  let reservationQuery = Reservation.find({
      venue: venue._id,
      startAt: { $lt: dayEnd },
      endAt: { $gt: dayStart },
    });
  let blockQuery = BlockedSlot.find({
      venue: venue._id,
      isActive: true,
      startAt: { $lt: dayEnd },
      endAt: { $gt: dayStart },
    });
  if (session) {
    reservationQuery = reservationQuery.session(session);
    blockQuery = blockQuery.session(session);
  }
  const [reservations, blocks] = await Promise.all([
    reservationQuery.lean(),
    blockQuery.lean(),
  ]);

  const operatingHours = venue.operatingHours.find(
    (hours) => hours.dayOfWeek === dateParts.weekday
  );

  const slots = venue.timeSlots.map((slot) => {
    const startsAt = campusMinuteToUtc(dateString, slot.startMinute);
    const endsAt = campusMinuteToUtc(dateString, slot.endMinute);
    let status = "AVAILABLE";

    if (
      !operatingHours ||
      operatingHours.isClosed ||
      slot.startMinute < operatingHours.opensAtMinute ||
      slot.endMinute > operatingHours.closesAtMinute
    ) {
      status = "CLOSED";
    } else if (reservations.some((reservation) =>
      overlaps(startsAt, endsAt, reservation.startAt, reservation.endAt)
    )) {
      status = "BOOKED";
    } else if (blocks.some((block) => overlaps(startsAt, endsAt, block.startAt, block.endAt))) {
      status = "BLOCKED";
    }

    return {
      key: slot.key,
      label: slot.label,
      startMinute: slot.startMinute,
      endMinute: slot.endMinute,
      status,
    };
  });

  return { venue: { id: venue._id, slug: venue.slug, name: venue.name }, date: dateString, slots };
}

module.exports = { getVenueAvailability, parseCampusDate, campusMinuteToUtc };
