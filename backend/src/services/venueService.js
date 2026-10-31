const Venue = require("../models/Venue");

async function listActiveVenues() {
  return Venue.find({ isActive: true }).sort({ name: 1 }).lean();
}

async function getActiveVenueBySlug(slug) {
  return Venue.findOne({ slug, isActive: true }).lean();
}

module.exports = { listActiveVenues, getActiveVenueBySlug };
