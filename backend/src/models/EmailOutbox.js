const mongoose = require("mongoose");

const emailOutboxSchema = new mongoose.Schema({
  recipient: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true, maxlength: 250 },
  text: { type: String, required: true, maxlength: 12000 },
  relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  status: { type: String, enum: ["PENDING", "SENDING", "SENT", "FAILED"], default: "PENDING", index: true },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now, index: true },
  lastError: { type: String, trim: true, maxlength: 1000, default: "" },
  sentAt: { type: Date, default: null },
}, { timestamps: true });

emailOutboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });

module.exports = mongoose.model("EmailOutbox", emailOutboxSchema);
