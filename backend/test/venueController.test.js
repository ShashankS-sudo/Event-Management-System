const test = require("node:test");
const assert = require("node:assert/strict");
const venueService = require("../src/services/venueService");
const availabilityService = require("../src/services/availabilityService");
const { listVenues, getVenue } = require("../src/controllers/venueController");
const { getAvailability } = require("../src/controllers/venueController");

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("lists active venues through the service", async () => {
  const original = venueService.listActiveVenues;
  const venues = [{ slug: "sample-venue", name: "Sample Venue" }];
  venueService.listActiveVenues = async () => venues;
  try {
    const res = responseRecorder();
    await listVenues({}, res, assert.fail);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, venues });
  } finally {
    venueService.listActiveVenues = original;
  }
});

test("returns a venue by slug or a not-found response", async () => {
  const original = venueService.getActiveVenueBySlug;
  const venue = { slug: "sample-venue", name: "Sample Venue" };
  venueService.getActiveVenueBySlug = async (slug) =>
    slug === venue.slug ? venue : null;
  try {
    const found = responseRecorder();
    await getVenue({ params: { slug: venue.slug } }, found, assert.fail);
    assert.equal(found.statusCode, 200);
    assert.deepEqual(found.body, { success: true, venue });

    const missing = responseRecorder();
    await getVenue({ params: { slug: "unknown" } }, missing, assert.fail);
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.body.message, "Venue not found");
  } finally {
    venueService.getActiveVenueBySlug = original;
  }
});

test("returns availability data and forwards invalid date errors", async () => {
  const original = availabilityService.getVenueAvailability;
  availabilityService.getVenueAvailability = async (slug, date) => ({ venue: { slug }, date, slots: [] });
  try {
    const res = responseRecorder();
    await getAvailability({ params: { slug: "sample-venue" }, query: { date: "2026-12-15" } }, res, assert.fail);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.availability.date, "2026-12-15");

    const error = new Error("Invalid date");
    error.status = 400;
    availabilityService.getVenueAvailability = async () => { throw error; };
    let forwarded;
    await getAvailability({ params: { slug: "sample-venue" }, query: {} }, responseRecorder(), (value) => { forwarded = value; });
    assert.equal(forwarded, error);
  } finally {
    availabilityService.getVenueAvailability = original;
  }
});
