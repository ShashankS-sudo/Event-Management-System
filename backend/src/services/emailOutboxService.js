const EmailOutbox = require("../models/EmailOutbox");

const MANAGEMENT_NOTIFICATION_EMAIL = process.env.MANAGEMENT_NOTIFICATION_EMAIL || "1jb24cs172gdg@gmail.com";
const MAX_ATTEMPTS = 8;
let transporter;

function isMailConfigured(env = process.env) {
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_USER?.trim() && env.SMTP_PASSWORD);
}

function bookingEmail(booking, venue, type = "BOOKING_SUBMITTED") {
  const reference = String(booking._id);
  const contact = booking.contactDetails || {};
  const isCancellation = type === "CANCELLATION_REQUESTED";
  const subject = isCancellation
    ? `Venue cancellation request · ${venue.name} · ${reference}`
    : `${type === "BOOKING_RESUBMITTED" ? "Revised venue request" : "New venue booking request"} · ${venue.name} · ${reference}`;
  const lines = [
    isCancellation ? "A customer submitted a venue cancellation request for management review." : "A customer submitted a venue booking request.",
    "",
    `Booking reference: ${reference}`,
    `Venue: ${venue.name}`,
    `Event: ${booking.eventTitle}`,
    `Organization: ${contact.organization || booking.department}`,
    `Contact person: ${contact.name || "Not provided"}`,
    `Phone: ${contact.phone || "Not provided"}`,
    `Email: ${contact.email || "Not provided"}`,
    `Event date: ${new Date(booking.eventDate).toISOString().slice(0, 10)}`,
    `Time: ${venue.timeSlots?.find((slot) => slot.key === booking.slotKey)?.label || booking.slotKey}`,
    `Expected attendees: ${booking.expectedAttendees}`,
    `Description: ${booking.eventDescription}`,
  ];
  if (booking.cancellationException?.reason) lines.push(`Cancellation reason: ${booking.cancellationException.reason}`);
  lines.push("", "Review this request in the SJBIT Venue Booking administration portal.");
  return { recipient: MANAGEMENT_NOTIFICATION_EMAIL.toLowerCase(), subject, text: lines.join("\n"), relatedBooking: booking._id };
}

function getTransporter(env = process.env) {
  if (!isMailConfigured(env)) return null;
  if (!transporter) {
    const nodemailer = require("nodemailer");
    const port = Number(env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST.trim(),
      port,
      secure: env.SMTP_SECURE === "true" || port === 465,
      auth: { user: env.SMTP_USER.trim(), pass: env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

async function deliverPendingEmails({ now = new Date(), limit = 10 } = {}) {
  const mailer = getTransporter();
  if (!mailer) return { skipped: true, delivered: 0, message: "SMTP is not configured" };

  let delivered = 0;
  for (let index = 0; index < limit; index += 1) {
    const staleSending = new Date(now.getTime() - 5 * 60 * 1000);
    const message = await EmailOutbox.findOneAndUpdate({
      attempts: { $lt: MAX_ATTEMPTS },
      $or: [
        { status: "PENDING", nextAttemptAt: { $lte: now } },
        { status: "SENDING", updatedAt: { $lte: staleSending } },
      ],
    }, { $set: { status: "SENDING" }, $inc: { attempts: 1 } }, { sort: { createdAt: 1 }, returnDocument: "after" });
    if (!message) break;

    try {
      await mailer.sendMail({
        from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER.trim(),
        to: message.recipient,
        subject: message.subject,
        text: message.text,
      });
      await EmailOutbox.updateOne({ _id: message._id, status: "SENDING" }, { $set: { status: "SENT", sentAt: new Date(), lastError: "" } });
      delivered += 1;
    } catch (error) {
      const failed = message.attempts >= MAX_ATTEMPTS;
      const backoff = Math.min(60, 2 ** message.attempts) * 60 * 1000;
      await EmailOutbox.updateOne({ _id: message._id, status: "SENDING" }, { $set: {
        status: failed ? "FAILED" : "PENDING",
        nextAttemptAt: new Date(now.getTime() + backoff),
        lastError: String(error.message || "Email delivery failed").slice(0, 1000),
      } });
    }
  }
  return { skipped: false, delivered };
}

function startEmailOutboxWorker() {
  if (!isMailConfigured()) {
    console.warn("Management email outbox is queued; configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and optionally SMTP_PORT/SMTP_FROM to send.");
  }
  const process = () => deliverPendingEmails().catch((error) => console.error(`Email outbox worker error: ${error.message}`));
  process();
  const timer = setInterval(process, 30_000);
  timer.unref?.();
  return timer;
}

module.exports = { MANAGEMENT_NOTIFICATION_EMAIL, bookingEmail, deliverPendingEmails, isMailConfigured, startEmailOutboxWorker };
