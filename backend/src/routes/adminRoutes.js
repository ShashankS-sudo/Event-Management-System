const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { listApproverBookings } = require("../controllers/adminBookingController");

const router = express.Router();

router.use(protect, authorizeRoles("ADMIN", "HOD", "PRINCIPAL"));
router.get("/bookings", listApproverBookings);

module.exports = router;
