const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Notification = require("../src/models/Notification");
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../src/services/notificationService");

test("lists only a user's notifications and unread count", async (t) => {
  const originals = { find: Notification.find, count: Notification.countDocuments };
  const userId = new mongoose.Types.ObjectId();
  const records = [{ recipient: userId, isRead: false }];
  let filter;
  Notification.find = (query) => {
    filter = query;
    return {
      sort() { return this; },
      limit() { return this; },
      lean: async () => records,
    };
  };
  Notification.countDocuments = async () => 1;
  t.after(() => {
    Notification.find = originals.find;
    Notification.countDocuments = originals.count;
  });

  const result = await listNotifications(userId);
  assert.deepEqual(filter, { recipient: userId });
  assert.deepEqual(result, { notifications: records, unreadCount: 1 });
});

test("marks only owned notifications read and supports mark-all", async (t) => {
  const originals = {
    findOneAndUpdate: Notification.findOneAndUpdate,
    updateMany: Notification.updateMany,
  };
  let filter;
  Notification.findOneAndUpdate = (query) => {
    filter = query;
    return { lean: async () => ({ _id: query._id, recipient: query.recipient, isRead: true }) };
  };
  Notification.updateMany = async (query) => {
    filter = query;
    return { modifiedCount: 3 };
  };
  t.after(() => {
    Notification.findOneAndUpdate = originals.findOneAndUpdate;
    Notification.updateMany = originals.updateMany;
  });

  const notificationId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const updated = await markNotificationRead(userId, String(notificationId));
  assert.deepEqual(filter, { _id: String(notificationId), recipient: userId });
  assert.equal(updated.isRead, true);
  assert.equal(await markNotificationRead(userId, "invalid-id"), null);
  assert.equal(await markAllNotificationsRead(userId), 3);
  assert.deepEqual(filter, { recipient: userId, isRead: false });
});
