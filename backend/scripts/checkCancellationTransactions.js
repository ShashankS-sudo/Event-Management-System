require("dotenv").config();

const crypto = require("node:crypto");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Venue = require("../src/models/Venue");
const Booking = require("../src/models/Booking");
const Reservation = require("../src/models/Reservation");
const Notification = require("../src/models/Notification");
const EmailOutbox = require("../src/models/EmailOutbox");
const { campusMinuteToUtc } = require("../src/services/availabilityService");
const { cancelCustomerBooking, requestCancellationException, decideCancellationException } = require("../src/services/customerBookingActions");

function futureCampusDate(daysAhead) {
  const campusNow = new Date(Date.now() + 330 * 60 * 1000);
  campusNow.setUTCDate(campusNow.getUTCDate() + daysAhead);
  return campusNow.toISOString().slice(0, 10);
}

async function createApprovedRequest(venue, requester, dateString, title) {
  const eventDate = new Date(`${dateString}T00:00:00.000Z`);
  const [booking] = await Booking.create([{
    venue: venue._id,
    requester: requester._id,
    createdBy: requester._id,
    source: "REQUEST",
    eventTitle: title,
    department: "Temporary Test",
    eventDate,
    slotKey: "test-slot",
    expectedAttendees: 10,
    eventDescription: "Temporary isolated cancellation transaction test.",
    status: "APPROVED",
    decidedBy: requester._id,
    decidedAt: new Date(),
    history: [{ status: "PENDING", actor: requester._id }, { status: "APPROVED", actor: requester._id }],
  }]);
  await Reservation.create([{
    venue: venue._id,
    booking: booking._id,
    startAt: campusMinuteToUtc(dateString, 540),
    endAt: campusMinuteToUtc(dateString, 660),
  }]);
  return booking;
}

async function checkCancellationTransactions() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured in backend/.env");
  const testDatabaseName = `sjbcancel_${crypto.randomBytes(10).toString("hex")}`;
  let passed = false;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: testDatabaseName });
    if (mongoose.connection.db.databaseName !== testDatabaseName) throw new Error("Refusing to run outside the isolated temporary database");

    const suffix = crypto.randomBytes(6).toString("hex");
    const requester = await User.create({ name: "Temporary Cancellation Test", email: `cancel-${suffix}@example.invalid`, password: "temporary-test-hash", role: "CUSTOMER" });
    const principal = await User.create({ name: "Temporary Exception Approver", email: `principal-${suffix}@example.invalid`, password: "temporary-test-hash", role: "PRINCIPAL" });
    const admin = await User.create({ name: "Temporary Second Approver", email: `admin-${suffix}@example.invalid`, password: "temporary-test-hash", role: "ADMIN" });
    const venue = await Venue.create({
      name: `Temporary Cancellation Venue ${suffix}`,
      slug: `cancel-test-${suffix}`,
      type: "Temporary Test Venue",
      capacity: 100,
      facilities: [],
      timeSlots: [{ key: "test-slot", label: "Test slot", startMinute: 540, endMinute: 600 }],
      operatingHours: [],
      isActive: true,
    });

    const normalCancellation = await createApprovedRequest(venue, requester, futureCampusDate(10), "Temporary Normal Cancellation");
    const cancelled = await cancelCustomerBooking(requester, String(normalCancellation._id));
    const normalReservation = await Reservation.findOne({ booking: normalCancellation._id }).lean();
    const normalCancellationEmails = await EmailOutbox.countDocuments({ relatedBooking: normalCancellation._id, status: "PENDING" });
    if (cancelled.status !== "CANCELLED" || normalReservation || normalCancellationEmails !== 1) throw new Error("Approved customer cancellation did not release its reservation and queue one management email");

    const lateCancellation = await createApprovedRequest(venue, requester, futureCampusDate(2), "Temporary Late Cancellation");
    const pendingException = await requestCancellationException(requester, String(lateCancellation._id), "The event schedule changed unexpectedly.");
    if (pendingException.cancellationException.status !== "PENDING") throw new Error("Late cancellation exception was not recorded as pending");
    const decided = await decideCancellationException(principal, String(lateCancellation._id), "APPROVED");
    const lateReservation = await Reservation.findOne({ booking: lateCancellation._id }).lean();
    const recipientNotifications = await Notification.countDocuments({ relatedBooking: lateCancellation._id });
    const lateCancellationEmails = await EmailOutbox.countDocuments({ relatedBooking: lateCancellation._id, status: "PENDING" });
    if (decided.status !== "CANCELLED" || decided.cancellationException.status !== "APPROVED" || lateReservation || recipientNotifications < 3 || lateCancellationEmails !== 1) {
      throw new Error("Approved late cancellation did not atomically cancel, release, and notify");
    }

    const racingException = await createApprovedRequest(venue, requester, futureCampusDate(2), "Temporary Concurrent Exception Decision");
    const requestedRace = await requestCancellationException(requester, String(racingException._id), "A schedule change requires a cancellation review.");
    if (requestedRace.cancellationException.status !== "PENDING") throw new Error("Concurrent decision test exception was not pending");
    const notificationsBeforeRace = await Notification.countDocuments({ relatedBooking: racingException._id, type: "CANCELLATION_EXCEPTION" });
    const raceResults = await Promise.allSettled([
      decideCancellationException(principal, String(racingException._id), "APPROVED"),
      decideCancellationException(admin, String(racingException._id), "REJECTED", "Keep the reservation as scheduled."),
    ]);
    const raceWinners = raceResults.filter((result) => result.status === "fulfilled");
    if (raceWinners.length !== 1) throw new Error(`Expected exactly one cancellation-exception decision to commit; got ${raceWinners.length}`);
    const finalRaceBooking = await Booking.findById(racingException._id).lean();
    const finalRaceReservation = await Reservation.findOne({ booking: racingException._id }).lean();
    const raceDecisionNotifications = await Notification.countDocuments({ relatedBooking: racingException._id, type: "CANCELLATION_EXCEPTION" });
    const finalExceptionDecision = finalRaceBooking?.cancellationException?.status;
    if (finalExceptionDecision === "APPROVED") {
      if (finalRaceBooking.status !== "CANCELLED" || finalRaceReservation || raceDecisionNotifications !== notificationsBeforeRace + 1) {
        throw new Error("Approved concurrent exception left an inconsistent booking, reservation, or notification state");
      }
    } else if (finalExceptionDecision === "REJECTED") {
      if (finalRaceBooking.status !== "APPROVED" || !finalRaceReservation || raceDecisionNotifications !== notificationsBeforeRace + 1) {
        throw new Error("Rejected concurrent exception changed the reservation or left an inconsistent notification state");
      }
    } else {
      throw new Error(`Unexpected final cancellation-exception decision: ${finalExceptionDecision}`);
    }

    const racingSubmission = await createApprovedRequest(venue, requester, futureCampusDate(2), "Temporary Concurrent Exception Submission");
    const submissionResults = await Promise.allSettled([
      requestCancellationException(requester, String(racingSubmission._id), "The event schedule changed unexpectedly."),
      requestCancellationException(requester, String(racingSubmission._id), "The venue is no longer needed for this event."),
    ]);
    const submissionWinners = submissionResults.filter((result) => result.status === "fulfilled");
    const finalSubmissionBooking = await Booking.findById(racingSubmission._id).lean();
    const submissionNotificationCount = await Notification.countDocuments({ relatedBooking: racingSubmission._id, type: "CANCELLATION_EXCEPTION" });
    const submissionEmailCount = await EmailOutbox.countDocuments({ relatedBooking: racingSubmission._id, status: "PENDING" });
    if (submissionWinners.length !== 1 || finalSubmissionBooking?.cancellationException?.status !== "PENDING" || submissionNotificationCount !== 3 || submissionEmailCount !== 1) {
      throw new Error(`Concurrent exception submissions produced ${submissionWinners.length} winners, status ${finalSubmissionBooking?.cancellationException?.status}, ${submissionNotificationCount} notifications, and ${submissionEmailCount} emails`);
    }
    passed = true;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      try {
        if (mongoose.connection.db?.databaseName === testDatabaseName) await mongoose.connection.dropDatabase();
      } finally { await mongoose.disconnect(); }
    }
  }
  if (passed) process.stdout.write("Atlas cancellation transaction checks passed in an isolated temporary database: regular cancellation, approved late exception, concurrent exception submission, and competing exception decisions preserved booking/reservation consistency and notifications.\n");
}

checkCancellationTransactions().catch((error) => {
  process.stderr.write(`Cancellation transaction check failed: ${error.message}\n`);
  process.stderr.write("Temporary database cleanup was attempted; verify its removal if the check failed during setup.\n");
  process.exitCode = 1;
});
