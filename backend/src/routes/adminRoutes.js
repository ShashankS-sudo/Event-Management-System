const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  listApproverBookings,
  listBlockedSlots,
  createBlockedSlot,
  removeBlockedSlot,
  createManualBooking,
  listManagedVenues,
  createVenue,
  updateVenue,
} = require("../controllers/adminBookingController");

const router = express.Router();

router.use(protect, authorizeRoles("ADMIN", "HOD", "PRINCIPAL"));
router.get("/bookings", listApproverBookings);
router.get("/blocked-slots", authorizeRoles("ADMIN"), listBlockedSlots);
router.post("/blocked-slots", authorizeRoles("ADMIN"), createBlockedSlot);
router.delete("/blocked-slots/:id", authorizeRoles("ADMIN"), removeBlockedSlot);
router.post("/manual-bookings", authorizeRoles("ADMIN"), createManualBooking);
router.get("/venues", authorizeRoles("ADMIN"), listManagedVenues);
router.post("/venues", authorizeRoles("ADMIN"), createVenue);
router.patch("/venues/:id", authorizeRoles("ADMIN"), updateVenue);

module.exports = router;
