const adminBookingService = require("../services/adminBookingService");
const blockedSlotService = require("../services/blockedSlotService");
const manualBookingService = require("../services/manualBookingService");
const venueAdminService = require("../services/venueAdminService");

async function listManagedVenues(req, res, next) {
  try { const venues = await venueAdminService.listManagedVenues(); return res.status(200).json({ success: true, venues }); }
  catch (error) { return next(error); }
}

async function createVenue(req, res, next) {
  try { const venue = await venueAdminService.createVenue(req.body); return res.status(201).json({ success: true, venue }); }
  catch (error) { return next(error); }
}

async function updateVenue(req, res, next) {
  try { const venue = await venueAdminService.updateVenue(req.params.id, req.body); return res.status(200).json({ success: true, venue }); }
  catch (error) { return next(error); }
}

async function listApproverBookings(req, res, next) {
  try {
    const bookings = await adminBookingService.listApproverBookings(req.user, req.query.status);
    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    return next(error);
  }
}

async function listBlockedSlots(req, res, next) {
  try {
    const blockedSlots = await blockedSlotService.listActiveBlockedSlots();
    return res.status(200).json({ success: true, blockedSlots });
  } catch (error) {
    return next(error);
  }
}

async function createBlockedSlot(req, res, next) {
  try {
    const result = await blockedSlotService.createBlockedSlot(req.user, req.body);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    if (error.status === 409 && error.details) {
      return res.status(409).json({ success: false, message: error.message, ...error.details });
    }
    return next(error);
  }
}

async function removeBlockedSlot(req, res, next) {
  try {
    const blockedSlot = await blockedSlotService.removeBlockedSlot(req.user, req.params.id);
    if (!blockedSlot) return res.status(404).json({ success: false, message: "Blocked period not found" });
    return res.status(200).json({ success: true, blockedSlot });
  } catch (error) {
    return next(error);
  }
}

async function createManualBooking(req, res, next) {
  try {
    const result = await manualBookingService.createManualBooking(req.user, req.body);
    return res.status(201).json({ success: true, message: "Manual reservation created", ...result });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listApproverBookings, listBlockedSlots, createBlockedSlot, removeBlockedSlot, createManualBooking, listManagedVenues, createVenue, updateVenue };
