import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Notifications.css";

const labels = {
  BOOKING_SUBMITTED: "Request submitted",
  BOOKING_RESUBMITTED: "Request resubmitted",
  BOOKING_APPROVED: "Booking approved",
  BOOKING_REJECTED: "Booking update",
  BOOKING_CONFLICT_REJECTED: "Conflicting request update",
  BOOKING_CANCELLED: "Booking cancelled",
  ADMIN_ACTION: "Administrative update",
};

function Notifications() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/notifications")
      .then((response) => {
        if (!active) return;
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.response?.status === 401) navigate("/login", { state: { from: location }, replace: true });
        else setError(requestError.response?.data?.message || "Could not load notifications.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location, navigate]);

  async function markRead(notification) {
    if (notification.isRead) return;
    setWorkingId(notification._id);
    try {
      const response = await api.patch(`/notifications/${notification._id}/read`);
      setNotifications((current) => current.map((item) => item._id === notification._id ? response.data.notification : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update this notification.");
    } finally {
      setWorkingId("");
    }
  }

  async function markAllRead() {
    setWorkingId("all");
    try {
      await api.patch("/notifications/read-all");
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not mark notifications as read.");
    } finally {
      setWorkingId("");
    }
  }

  return (
    <main className="notifications-page">
      <header className="notifications-heading">
        <Link to="/" className="notifications-back">← Home</Link>
        <div><span className="booking-eyebrow">CUSTOMER PORTAL</span><h1>Notifications</h1><p>Updates about your venue booking requests.</p></div>
        {unreadCount > 0 && <button type="button" className="mark-all-button" onClick={markAllRead} disabled={workingId === "all"}>{workingId === "all" ? "Updating…" : `Mark all read (${unreadCount})`}</button>}
      </header>
      {error && <p className="notifications-error" role="alert">{error}</p>}
      {loading && <p className="notifications-state" aria-live="polite">Loading notifications…</p>}
      {!loading && !error && notifications.length === 0 && <section className="notifications-empty"><h2>You're all caught up</h2><p>Booking updates will appear here.</p><Link to="/bookings">View My Bookings</Link></section>}
      {!loading && notifications.length > 0 && <section className="notification-list" aria-label="Your notifications">{notifications.map((notification) => {
        const content = <><span className="notification-icon">{notification.isRead ? "✓" : "•"}</span><span className="notification-copy"><strong>{labels[notification.type] || "Booking update"}</strong><span>{notification.message}</span><small>{new Date(notification.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small></span>{!notification.isRead && <span className="unread-dot" aria-label="Unread" />}</>;
        return <article className={`notification-card ${notification.isRead ? "read" : "unread"}`} key={notification._id}>
          {notification.relatedBooking ? <Link className="notification-content" to={`/bookings/${notification.relatedBooking}`} onClick={() => markRead(notification)}>{content}</Link> : <div className="notification-content">{content}</div>}
          {!notification.isRead && <button type="button" className="mark-one-button" onClick={() => markRead(notification)} disabled={workingId === notification._id}>{workingId === notification._id ? "Saving…" : "Mark read"}</button>}
        </article>;
      })}</section>}
    </main>
  );
}

export default Notifications;
