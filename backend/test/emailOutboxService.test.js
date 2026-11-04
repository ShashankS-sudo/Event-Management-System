const test = require("node:test");
const assert = require("node:assert/strict");
const { bookingEmail, isMailConfigured, MANAGEMENT_NOTIFICATION_EMAIL } = require("../src/services/emailOutboxService");

test("formats a management booking email with organization contact and chosen time range", () => {
  const message = bookingEmail({
    _id: "booking-ref",
    eventTitle: "Technology Showcase",
    department: "Example Organization",
    contactDetails: { name: "A Contact", phone: "+91 9876543210", email: "contact@example.org", organization: "Example Organization" },
    eventDate: "2099-12-15T00:00:00.000Z",
    slotKey: "0830-1230",
    expectedAttendees: 80,
    eventDescription: "A showcase event for new technology.",
  }, { name: "Seminar Hall", timeSlots: [{ key: "0830-1230", label: "8:30 AM – 12:30 PM" }] });

  assert.equal(message.recipient, MANAGEMENT_NOTIFICATION_EMAIL.toLowerCase());
  assert.match(message.subject, /New venue booking request/);
  assert.match(message.text, /Organization: Example Organization/);
  assert.match(message.text, /Phone: \+91 9876543210/);
  assert.match(message.text, /Time: 8:30 AM – 12:30 PM/);
});

test("formats late cancellation requests for management review", () => {
  const message = bookingEmail({
    _id: "booking-ref",
    eventTitle: "Technology Showcase",
    eventDate: new Date("2099-12-15T00:00:00.000Z"),
    slotKey: "0830-1230",
    cancellationException: { reason: "The event schedule changed unexpectedly." },
  }, { name: "Seminar Hall", timeSlots: [] }, "CANCELLATION_REQUESTED");
  assert.match(message.subject, /cancellation request/);
  assert.match(message.text, /The event schedule changed unexpectedly/);
});

test("requires complete SMTP settings before trying to send queued email", () => {
  assert.equal(isMailConfigured({ SMTP_HOST: "smtp.example.org", SMTP_USER: "sender@example.org", SMTP_PASSWORD: "secret" }), true);
  assert.equal(isMailConfigured({ SMTP_HOST: "smtp.example.org", SMTP_USER: "sender@example.org" }), false);
});
