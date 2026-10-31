const express = require("express");
const { listVenues, getVenue, getAvailability } = require("../controllers/venueController");

const router = express.Router();

router.get("/", listVenues);
router.get("/:slug/availability", getAvailability);
router.get("/:slug", getVenue);

module.exports = router;
