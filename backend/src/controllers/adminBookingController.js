const adminBookingService = require("../services/adminBookingService");

async function listApproverBookings(req, res, next) {
  try {
    const bookings = await adminBookingService.listApproverBookings(req.user, req.query.status);
    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listApproverBookings };
