const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "BOOKING_SUBMITTED",
        "BOOKING_APPROVED",
        "BOOKING_REJECTED",
        "BOOKING_CONFLICT_REJECTED",
        "BOOKING_CANCELLED",
        "BOOKING_RESUBMITTED",
        "ADMIN_ACTION",
      ],
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
