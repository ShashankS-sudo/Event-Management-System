require("dotenv").config();

const crypto = require("node:crypto");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Venue = require("../src/models/Venue");
const Booking = require("../src/models/Booking");
const Reservation = require("../src/models/Reservation");
const Notification = require("../src/models/Notification");
const BlockedSlot = require("../src/models/BlockedSlot");
const EmailOutbox = require("../src/models/EmailOutbox");
const { applyDecision } = require("../src/services/approvalService");
const { submitBookingRequest } = require("../src/services/bookingService");
const { createManualBooking } = require("../src/services/manualBookingService");
const { createBlockedSlot } = require("../src/services/blockedSlotService");

function futureCampusDate() {
  const campusNow = new Date(Date.now() + 330 * 60 * 1000);
  campusNow.setUTCDate(campusNow.getUTCDate() + 2);
  return campusNow.toISOString().slice(0, 10);
}

async function checkConcurrentApprovals() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured in backend/.env");
  const testDatabaseName = `sjbtest_${crypto.randomBytes(10).toString("hex")}`;

  const suffix = crypto.randomBytes(6).toString("hex");
  let resultSummary;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: testDatabaseName });
    if (mongoose.connection.db.databaseName !== testDatabaseName) throw new Error("Refusing to run outside the isolated temporary test database");

    const requester = await User.create({ name: "Temporary Booking Test", email: `customer-${suffix}@example.invalid`, password: "temporary-test-hash", role: "CUSTOMER" });
    const approver = await User.create({ name: "Temporary Approver Test", email: `approver-${suffix}@example.invalid`, password: "temporary-test-hash", role: "PRINCIPAL" });
    const venue = await Venue.create({
      name: `Temporary Concurrency Venue ${suffix}`,
      slug: `concurrency-test-${suffix}`,
      type: "Temporary Test Venue",
      capacity: 100,
      facilities: [],
      timeSlots: [
        { key: "test-slot", label: "Test slot", startMinute: 540, endMinute: 600 },
        { key: "manual-test-slot", label: "Manual collision test slot", startMinute: 780, endMinute: 840 },
        { key: "block-test-slot", label: "Block collision test slot", startMinute: 1020, endMinute: 1080 },
        { key: "submission-block-slot", label: "Submission block test slot", startMinute: 1200, endMinute: 1260 },
      ],
      operatingHours: Array.from({ length: 7 }, (_item, dayOfWeek) => ({ dayOfWeek, isClosed: false, opensAtMinute: 0, closesAtMinute: 1440 })),
      isActive: true,
    });
    const eventDate = new Date(`${futureCampusDate()}T00:00:00.000Z`);
    const bookings = await Booking.create([
      { venue: venue._id, requester: requester._id, createdBy: requester._id, eventTitle: "Temporary Event One", department: "Test", eventDate, slotKey: "test-slot", expectedAttendees: 10, eventDescription: "Temporary concurrency test booking one.", status: "PENDING", history: [{ status: "PENDING", actor: requester._id, reason: "Temporary test" }] },
      { venue: venue._id, requester: requester._id, createdBy: requester._id, eventTitle: "Temporary Event Two", department: "Test", eventDate, slotKey: "test-slot", expectedAttendees: 10, eventDescription: "Temporary concurrency test booking two.", status: "PENDING", history: [{ status: "PENDING", actor: requester._id, reason: "Temporary test" }] },
    ]);

    const results = await Promise.allSettled(bookings.map((booking) => applyDecision(String(booking._id), approver, "APPROVED")));
    const finalBookings = await Booking.find({ _id: { $in: bookings.map((booking) => booking._id) } }).lean();
    const reservations = await Reservation.find({ booking: { $in: bookings.map((booking) => booking._id) } }).lean();
    const notifications = await Notification.find({ relatedBooking: { $in: bookings.map((booking) => booking._id) } }).lean();
    const approvedCount = finalBookings.filter((booking) => booking.status === "APPROVED").length;
    const conflictRejectedCount = finalBookings.filter((booking) => booking.status === "REJECTED" && booking.rejectionReason.includes("Conflicts with another booking approved")).length;
    const conflictCount = results.filter((result) => result.status === "rejected" && result.reason.status === 409).length;
    if (approvedCount !== 1 || conflictRejectedCount !== 1 || reservations.length !== 1 || conflictCount !== 1 || notifications.length < 2) {
      const outcomes = results.map((result) => result.status === "fulfilled" ? "fulfilled" : `rejected-${result.reason.status || result.reason.name}:${result.reason.message}`).join(" || ");
      throw new Error(`Invariant counts: approved=${approvedCount}, conflictRejected=${conflictRejectedCount}, reservations=${reservations.length}, expected409=${conflictCount}, notifications=${notifications.length}, outcomes=${outcomes}`);
    }

    const manualCollisionRequest = await Booking.create({
      venue: venue._id, requester: requester._id, createdBy: requester._id,
      eventTitle: "Temporary Manual Collision Request", department: "Test", eventDate,
      slotKey: "manual-test-slot", expectedAttendees: 10,
      eventDescription: "Temporary booking racing an admin manual reservation.",
      status: "PENDING", history: [{ status: "PENDING", actor: requester._id, reason: "Temporary test" }],
    });
    const manualInput = {
      venueSlug: venue.slug, eventTitle: "Temporary Manual Collision Reservation", department: "Test",
      eventDate: futureCampusDate(), slotKey: "manual-test-slot", expectedAttendees: 10,
      eventDescription: "Temporary manual reservation collision test.", facilitiesRequested: [],
    };
    const manualRace = await Promise.allSettled([
      applyDecision(String(manualCollisionRequest._id), approver, "APPROVED"),
      createManualBooking({ _id: approver._id, role: "ADMIN" }, manualInput),
    ]);
    const finalRequest = await Booking.findById(manualCollisionRequest._id).lean();
    const manualBooking = await Booking.findOne({ venue: venue._id, eventTitle: manualInput.eventTitle, source: "MANUAL" }).lean();
    const contestedReservations = await Reservation.find({ booking: { $in: [manualCollisionRequest._id, ...(manualBooking ? [manualBooking._id] : [])] } }).lean();
    const raceSuccesses = manualRace.filter((item) => item.status === "fulfilled").length;
    const raceConflicts = manualRace.filter((item) => item.status === "rejected" && item.reason.status === 409).length;
    const customerWon = finalRequest.status === "APPROVED" && !manualBooking;
    const manualWon = finalRequest.status === "REJECTED" && manualBooking?.status === "APPROVED";
    if (raceSuccesses !== 1 || raceConflicts !== 1 || contestedReservations.length !== 1 || !(customerWon || manualWon)) {
      const outcomes = manualRace.map((item) => item.status === "fulfilled" ? "fulfilled" : `rejected-${item.reason.status || item.reason.name}:${item.reason.message}`).join(" || ");
      throw new Error(`Manual-vs-approval race invariant failed: request=${finalRequest.status}, manual=${manualBooking?.status || "absent"}, reservations=${contestedReservations.length}, outcomes=${outcomes}`);
    }

    const blockedCollisionRequest = await Booking.create({
      venue: venue._id, requester: requester._id, createdBy: requester._id,
      eventTitle: "Temporary Block Collision Request", department: "Test", eventDate,
      slotKey: "block-test-slot", expectedAttendees: 10,
      eventDescription: "Temporary booking racing an administrative block.",
      status: "PENDING", history: [{ status: "PENDING", actor: requester._id, reason: "Temporary test" }],
    });
    const blockDate = futureCampusDate();
    const blockInput = { venueSlug: venue.slug, startDate: blockDate, startMinute: 1020, endDate: blockDate, endMinute: 1080, reason: "Temporary concurrency test block" };
    const blockRace = await Promise.allSettled([
      applyDecision(String(blockedCollisionRequest._id), approver, "APPROVED"),
      createBlockedSlot({ _id: approver._id }, blockInput),
    ]);
    const finalBlockedRequest = await Booking.findById(blockedCollisionRequest._id).lean();
    const activeTestBlock = await BlockedSlot.findOne({ venue: venue._id, reason: blockInput.reason, isActive: true }).lean();
    const blockedReservations = await Reservation.find({ booking: blockedCollisionRequest._id }).lean();
    const blockRaceSuccesses = blockRace.filter((item) => item.status === "fulfilled").length;
    const blockRaceConflicts = blockRace.filter((item) => item.status === "rejected" && item.reason.status === 409).length;
    const bookingWonBlockRace = finalBlockedRequest.status === "APPROVED" && !activeTestBlock;
    const blockWonRace = finalBlockedRequest.status === "REJECTED" && Boolean(activeTestBlock);
    if (blockRaceSuccesses !== 1 || blockRaceConflicts !== 1 || blockedReservations.length !== (bookingWonBlockRace ? 1 : 0) || !(bookingWonBlockRace || blockWonRace)) {
      const outcomes = blockRace.map((item) => item.status === "fulfilled" ? "fulfilled" : `rejected-${item.reason.status || item.reason.name}:${item.reason.message}`).join(" || ");
      throw new Error(`Block-vs-approval race invariant failed: request=${finalBlockedRequest.status}, block=${Boolean(activeTestBlock)}, reservations=${blockedReservations.length}, outcomes=${outcomes}`);
    }

    const submissionBlockDate = futureCampusDate();
    const submissionTitle = `Temporary Submit Block Race ${suffix}`;
    const submissionBlockInput = { venueSlug: venue.slug, startDate: submissionBlockDate, startMinute: 1200, endDate: submissionBlockDate, endMinute: 1260, reason: "Temporary request submission race block" };
    const submissionBlockRace = await Promise.allSettled([
      submitBookingRequest(requester, {
        venueSlug: venue.slug, eventTitle: submissionTitle, department: "Test", eventDate: submissionBlockDate,
        contactDetails: { name: "Temporary Booking Test", phone: "+91 9876543210", email: `customer-${suffix}@example.invalid`, organization: "Temporary Test Organization" },
        slotKey: "submission-block-slot", expectedAttendees: 10,
        eventDescription: "Temporary customer request racing an administrative block.", facilitiesRequested: [], additionalRequirements: "",
      }),
      createBlockedSlot({ _id: approver._id }, submissionBlockInput),
    ]);
    const submissionResult = submissionBlockRace[0];
    const submittedBooking = await Booking.findOne({ venue: venue._id, eventTitle: submissionTitle }).lean();
    const submissionBlock = await BlockedSlot.findOne({ venue: venue._id, reason: submissionBlockInput.reason, isActive: true }).lean();
    const submissionNotifications = submittedBooking
      ? await Notification.countDocuments({ relatedBooking: submittedBooking._id })
      : 0;
    const submissionEmails = submittedBooking
      ? await EmailOutbox.countDocuments({ relatedBooking: submittedBooking._id, status: "PENDING" })
      : 0;
    const submissionRaceBlockWon = submissionBlockRace[1].status === "fulfilled" && Boolean(submissionBlock);
    const submittedThenRejected = submissionResult.status === "fulfilled"
      && submittedBooking?.status === "REJECTED"
      && submissionNotifications === 2
      && submissionEmails === 1;
    const blockedBeforeSubmit = submissionResult.status === "rejected"
      && submissionResult.reason.status === 409
      && !submittedBooking;
    if (!submissionRaceBlockWon || !(submittedThenRejected || blockedBeforeSubmit)) {
      const outcomes = submissionBlockRace.map((item) => item.status === "fulfilled" ? "fulfilled" : `rejected-${item.reason.status || item.reason.name}:${item.reason.message}`).join(" || ");
      throw new Error(`Submit-vs-block race invariant failed: booking=${submittedBooking?.status || "absent"}, block=${Boolean(submissionBlock)}, notifications=${submissionNotifications}, emails=${submissionEmails}, outcomes=${outcomes}`);
    }
    resultSummary = `Atlas concurrency checks passed in an isolated temporary database: approval-vs-approval preserved one winner; manual-vs-approval winner=${customerWon ? "customer" : "manual"}; block-vs-approval winner=${bookingWonBlockRace ? "approval" : "block"}; submit-vs-block winner=${submittedThenRejected ? "submitted then rejected" : "blocked before submit"}.`;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      try {
        if (mongoose.connection.db?.databaseName === testDatabaseName) await mongoose.connection.dropDatabase();
      } finally { await mongoose.disconnect(); }
    }
  }
  process.stdout.write(`${resultSummary}\n`);
}

checkConcurrentApprovals().catch((error) => {
  process.stderr.write(`Concurrent approval check failed: ${error.message}\n`);
  process.stderr.write("Temporary database cleanup was attempted; verify its removal if the check failed during setup.\n");
  process.exitCode = 1;
});
