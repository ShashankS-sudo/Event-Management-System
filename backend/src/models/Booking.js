const mongoose = require("mongoose");

const bookingHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      required: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, trim: true, default: "" },
    changedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
      index: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    source: {
      type: String,
      enum: ["REQUEST", "MANUAL"],
      default: "REQUEST",
      required: true,
    },
    eventTitle: { type: String, required: true, trim: true, minlength: 3, maxlength: 160 },
    department: { type: String, required: true, trim: true, maxlength: 120 },
    eventDate: { type: Date, required: true, index: true },
    slotKey: { type: String, required: true, trim: true },
    expectedAttendees: { type: Number, required: true, min: 1, max: 100000 },
    eventDescription: { type: String, required: true, trim: true, minlength: 10, maxlength: 4000 },
    facilitiesRequested: { type: [String], default: [] },
    additionalRequirements: { type: String, trim: true, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
      default: "PENDING",
      required: true,
      index: true,
    },
    rejectionReason: { type: String, trim: true, default: "" },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt: { type: Date, default: null },
    resubmittedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    history: { type: [bookingHistorySchema], default: [] },
  },
  { timestamps: true }
);

bookingSchema.index({ venue: 1, eventDate: 1, status: 1 });
bookingSchema.index({ requester: 1, createdAt: -1 });

bookingSchema.pre("validate", function validateBooking() {
  if (this.source === "REQUEST" && !this.requester) {
    this.invalidate("requester", "Customer booking requests must identify the requester");
  }
  if (this.source === "MANUAL" && this.requester) {
    this.invalidate("requester", "Manual reservations must not be attributed to a customer requester");
  }
  if (this.status === "REJECTED" && !this.rejectionReason.trim()) {
    this.invalidate("rejectionReason", "Rejected bookings require a reason");
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
