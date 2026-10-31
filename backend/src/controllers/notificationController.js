const notificationService = require("../services/notificationService");

async function listNotifications(req, res, next) {
  try {
    const result = await notificationService.listNotifications(req.user._id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationService.markNotificationRead(req.user._id, req.params.id);
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    return res.status(200).json({ success: true, notification });
  } catch (error) {
    return next(error);
  }
}

async function markAllRead(req, res, next) {
  try {
    const modifiedCount = await notificationService.markAllNotificationsRead(req.user._id);
    return res.status(200).json({ success: true, modifiedCount });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listNotifications, markRead, markAllRead };
