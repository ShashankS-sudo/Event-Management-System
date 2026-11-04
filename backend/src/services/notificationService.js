const mongoose = require("mongoose");
const Notification = require("../models/Notification");

async function listNotifications(userId) {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);
  return { notifications, unreadCount };
}

async function markNotificationRead(userId, notificationId) {
  if (!mongoose.isValidObjectId(notificationId)) return null;
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { isRead: true } },
    { returnDocument: "after" }
  ).lean();
}

async function markAllNotificationsRead(userId) {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } }
  );
  return result.modifiedCount;
}

module.exports = { listNotifications, markNotificationRead, markAllNotificationsRead };
