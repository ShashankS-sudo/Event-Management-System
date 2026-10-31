const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const {
  createBookingRequest,
  listMyBookings,
  getMyBooking,
  decideBooking,
  cancelMyBooking,
  resubmitMyBooking,
  requestCancellationException,
  decideCancellationException,
} = require("../controllers/bookingController");

const router = express.Router();

router.post("/", protect, authorizeRoles("CUSTOMER"), createBookingRequest);
router.get("/", protect, authorizeRoles("CUSTOMER"), listMyBookings);
router.get("/:id", protect, authorizeRoles("CUSTOMER"), getMyBooking);
router.patch("/:id/cancel", protect, authorizeRoles("CUSTOMER"), cancelMyBooking);
router.post("/:id/resubmit", protect, authorizeRoles("CUSTOMER"), resubmitMyBooking);
router.post("/:id/cancellation-exception", protect, authorizeRoles("CUSTOMER"), requestCancellationException);
router.patch("/:id/cancellation-exception/decision", protect, authorizeRoles("ADMIN", "HOD", "PRINCIPAL"), decideCancellationException);
router.patch("/:id/decision", protect, authorizeRoles("ADMIN", "HOD", "PRINCIPAL"), decideBooking);

module.exports = router;
