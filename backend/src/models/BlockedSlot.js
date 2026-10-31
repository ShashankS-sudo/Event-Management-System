const mongoose = require("mongoose");

const blockedSlotSchema = new mongoose.Schema(
  {
    venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, minlength: 3, maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    removedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

blockedSlotSchema.index({ venue: 1, startAt: 1, endAt: 1, isActive: 1 });
blockedSlotSchema.pre("validate", function validateInterval() {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    this.invalidate("endAt", "Blocked period end must be after its start");
  }
});

module.exports = mongoose.model("BlockedSlot", blockedSlotSchema);
