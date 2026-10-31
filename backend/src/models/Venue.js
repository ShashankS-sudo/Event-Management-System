const mongoose = require("mongoose");

const timeSlotSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    label: { type: String, required: true, trim: true },
    startMinute: { type: Number, required: true, min: 0, max: 1439 },
    endMinute: { type: Number, required: true, min: 1, max: 1440 },
  },
  { _id: false }
);

timeSlotSchema.pre("validate", function validateSlot() {
  if (this.startMinute >= this.endMinute) {
    this.invalidate("endMinute", "Slot end must be after its start");
  }
});

const operatingHoursSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isClosed: { type: Boolean, default: false },
    opensAtMinute: { type: Number, min: 0, max: 1439 },
    closesAtMinute: { type: Number, min: 1, max: 1440 },
  },
  { _id: false }
);

operatingHoursSchema.pre("validate", function validateHours() {
  if (!this.isClosed) {
    if (this.opensAtMinute == null || this.closesAtMinute == null) {
      this.invalidate("opensAtMinute", "Open and close times are required");
    } else if (this.opensAtMinute >= this.closesAtMinute) {
      this.invalidate("closesAtMinute", "Closing time must be after opening time");
    }
  }
});

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: { type: String, trim: true, default: "" },
    type: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: null },
    location: { type: String, trim: true, default: null },
    capacity: { type: Number, min: 1, default: null },
    facilities: { type: [String], default: [] },
    operatingHours: { type: [operatingHoursSchema], default: [] },
    timeSlots: { type: [timeSlotSchema], default: [] },
    approvalVersion: { type: Number, default: 0, select: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

venueSchema.pre("validate", function validateVenue() {
  const slotKeys = this.timeSlots.map((slot) => slot.key);
  if (new Set(slotKeys).size !== slotKeys.length) {
    this.invalidate("timeSlots", "Time slot keys must be unique within a venue");
  }

  const days = this.operatingHours.map((hours) => hours.dayOfWeek);
  if (new Set(days).size !== days.length) {
    this.invalidate("operatingHours", "Operating hours must contain each day at most once");
  }

});

module.exports = mongoose.model("Venue", venueSchema);
