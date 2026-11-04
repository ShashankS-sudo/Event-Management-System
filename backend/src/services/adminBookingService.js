const Booking = require("../models/Booking");
const Venue = require("../models/Venue");

const VALID_STATUSES = new Set(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED", "CANCELLATION_EXCEPTIONS"]);

function isCseHod(user) {
  const department = (user.department || "").trim().toUpperCase();
  return user.role === "HOD" && [
    "CSE",
    "COMPUTER SCIENCE AND ENGINEERING",
    "COMPUTER SCIENCE & ENGINEERING",
  ].includes(department);
}

async function listApproverBookings(user, requestedStatus = "PENDING") {
  const status = String(requestedStatus || "PENDING").toUpperCase();
  if (!VALID_STATUSES.has(status)) {
    const error = new Error("Unsupported booking status filter");
    error.status = 400;
    throw error;
  }

  const filter = {};
  if (status === "CANCELLATION_EXCEPTIONS") {
    filter["cancellationException.status"] = "PENDING";
  } else if (status !== "ALL") filter.status = status;

  if (user.role === "HOD") {
    if (!isCseHod(user)) {
      const error = new Error("No approval queue is assigned to this HOD");
      error.status = 403;
      throw error;
    }
    const venue = await Venue.findOne({ slug: "cse-seminar-hall" }).select("_id").lean();
    if (!venue) return [];
    filter.venue = venue._id;
  } else if (!["ADMIN", "PRINCIPAL"].includes(user.role)) {
    const error = new Error("Administrative booking access required");
    error.status = 403;
    throw error;
  }

  return Booking.find(filter)
    .sort({ eventDate: 1, createdAt: 1 })
    .limit(100)
    .populate("venue", "name slug type timeSlots")
    .populate("requester", "name email phone organization")
    .lean();
}

module.exports = { listApproverBookings, isCseHod, VALID_STATUSES };
