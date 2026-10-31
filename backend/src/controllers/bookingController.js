const bookingService = require("../services/bookingService");
const approvalService = require("../services/approvalService");

async function createBookingRequest(req, res, next) {
  try {
    const booking = await bookingService.submitBookingRequest(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: "Booking request submitted for approval",
      booking,
    });
  } catch (error) {
    return next(error);
  }
}

async function listMyBookings(req, res, next) {
  try {
    const bookings = await bookingService.listUserBookings(req.user._id);
    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    return next(error);
  }
}

async function getMyBooking(req, res, next) {
  try {
    const booking = await bookingService.getUserBooking(req.user._id, req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.status(200).json({ success: true, booking });
  } catch (error) {
    return next(error);
  }
}

async function decideBooking(req, res, next) {
  try {
    const { decision, reason } = req.body || {};
    const result = await approvalService.applyDecision(req.params.id, req.user, decision, reason);
    return res.status(200).json({
      success: true,
      message: decision === "APPROVED" ? "Booking approved" : "Booking rejected",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createBookingRequest, listMyBookings, getMyBooking, decideBooking };
