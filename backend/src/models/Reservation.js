const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  { timestamps: true }
);

reservationSchema.index({ venue: 1, startAt: 1, endAt: 1 });
reservationSchema.pre("validate", function validateInterval() {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    this.invalidate("endAt", "Reservation end must be after its start");
  }
});

module.exports = mongoose.model("Reservation", reservationSchema);
