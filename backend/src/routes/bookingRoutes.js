const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { createBookingRequest, listMyBookings, getMyBooking, decideBooking } = require("../controllers/bookingController");

const router = express.Router();

router.post("/", protect, authorizeRoles("CUSTOMER"), createBookingRequest);
router.get("/", protect, authorizeRoles("CUSTOMER"), listMyBookings);
router.get("/:id", protect, authorizeRoles("CUSTOMER"), getMyBooking);
router.patch("/:id/decision", protect, authorizeRoles("ADMIN", "HOD", "PRINCIPAL"), decideBooking);

module.exports = router;
