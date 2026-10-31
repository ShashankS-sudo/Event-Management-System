const venueService = require("../services/venueService");
const availabilityService = require("../services/availabilityService");

async function listVenues(req, res, next) {
  try {
    const venues = await venueService.listActiveVenues();
    res.status(200).json({ success: true, venues });
  } catch (error) {
    next(error);
  }
}

async function getVenue(req, res, next) {
  try {
    const venue = await venueService.getActiveVenueBySlug(req.params.slug);
    if (!venue) {
      return res.status(404).json({ success: false, message: "Venue not found" });
    }
    return res.status(200).json({ success: true, venue });
  } catch (error) {
    return next(error);
  }
}

async function getAvailability(req, res, next) {
  try {
    const availability = await availabilityService.getVenueAvailability(
      req.params.slug,
      req.query.date
    );
    if (!availability) {
      return res.status(404).json({ success: false, message: "Venue not found" });
    }
    return res.status(200).json({ success: true, availability });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listVenues, getVenue, getAvailability };
