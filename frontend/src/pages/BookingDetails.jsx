import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import "./Bookings.css";

function BookingDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/bookings/${id}`)
      .then((response) => { if (active) setBooking(response.data.booking); })
      .catch((requestError) => {
        if (requestError.response?.status === 401) {
          navigate("/login", { state: { from: location }, replace: true });
        } else if (active) {
          setError(requestError.response?.data?.message || "Booking not found.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, location, navigate]);

  const slot = booking?.venue?.timeSlots?.find((item) => item.key === booking.slotKey);
  const eventDate = booking?.eventDate ? new Date(booking.eventDate).toLocaleDateString("en-IN", { timeZone: "UTC", day: "2-digit", month: "long", year: "numeric" }) : "—";

  return (
    <main className="bookings-page">
      <Link to="/bookings" className="bookings-back">← Back to My Bookings</Link>
      {loading && <p className="bookings-state" aria-live="polite">Loading booking details…</p>}
      {error && <p className="bookings-error" role="alert">{error}</p>}
      {booking && !loading && (
        <section className="booking-detail-card">
          <div className="booking-detail-heading">
            <div>
              <span className="booking-eyebrow">BOOKING REFERENCE · {booking._id}</span>
              <h1>{booking.eventTitle}</h1>
            </div>
            <span className={`booking-status ${booking.status.toLowerCase()}`}>{booking.status}</span>
          </div>
          <div className="booking-detail-grid">
            <p><strong>Venue</strong><span>{booking.venue?.name || "—"}</span></p>
            <p><strong>Department / organization</strong><span>{booking.department}</span></p>
            <p><strong>Date</strong><span>{eventDate}</span></p>
            <p><strong>Time slot</strong><span>{slot?.label || booking.slotKey}</span></p>
            <p><strong>Expected attendees</strong><span>{booking.expectedAttendees}</span></p>
            <p><strong>Facilities requested</strong><span>{booking.facilitiesRequested?.join(", ") || "None"}</span></p>
            <p className="booking-detail-wide"><strong>Event description</strong><span>{booking.eventDescription}</span></p>
            {booking.additionalRequirements && <p className="booking-detail-wide"><strong>Additional requirements</strong><span>{booking.additionalRequirements}</span></p>}
            {booking.rejectionReason && <p className="booking-detail-wide rejection-reason"><strong>Rejection reason</strong><span>{booking.rejectionReason}</span></p>}
          </div>
          <h2 className="booking-history-title">Decision History</h2>
          <ol className="booking-history">
            {booking.history?.map((entry, index) => (
              <li key={`${entry.status}-${entry.changedAt}-${index}`}>
                <span className={`history-marker ${entry.status.toLowerCase()}`} />
                <div><strong>{entry.status}</strong><span>{entry.reason || "Status updated"}</span><small>{new Date(entry.changedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small></div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}

export default BookingDetails;
