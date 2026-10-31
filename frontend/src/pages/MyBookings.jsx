import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Bookings.css";

const filters = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];

function MyBookings() {
  const location = useLocation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/bookings")
      .then((response) => {
        if (active) setBookings(response.data.bookings);
      })
      .catch((requestError) => {
        if (requestError.response?.status === 401) {
          navigate("/login", { state: { from: location }, replace: true });
        } else if (active) {
          setError(requestError.response?.data?.message || "Could not load your bookings.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location, navigate]);

  const visibleBookings = useMemo(
    () => filter === "ALL" ? bookings : bookings.filter((booking) => booking.status === filter),
    [bookings, filter]
  );

  return (
    <main className="bookings-page">
      <header className="bookings-heading">
        <Link to="/" className="bookings-back">← Home</Link>
        <span className="booking-eyebrow">CUSTOMER PORTAL</span>
        <h1>My Bookings</h1>
        <p>Review your venue requests and their approval status.</p>
      </header>

      <div className="booking-filters" role="tablist" aria-label="Filter bookings by status">
        {filters.map((status) => (
          <button key={status} type="button" role="tab" aria-selected={filter === status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>
            {status === "ALL" ? `All (${bookings.length})` : `${status[0]}${status.slice(1).toLowerCase()} (${bookings.filter((booking) => booking.status === status).length})`}
          </button>
        ))}
      </div>

      {loading && <p className="bookings-state" aria-live="polite">Loading your bookings…</p>}
      {error && <p className="bookings-error" role="alert">{error}</p>}
      {!loading && !error && visibleBookings.length === 0 && (
        <section className="bookings-empty">
          <h2>{filter === "ALL" ? "No booking requests yet" : `No ${filter.toLowerCase()} bookings`}</h2>
          <p>Browse campus venues to start a booking request.</p>
          <Link to="/venues" className="booking-primary-link">Explore Venues</Link>
        </section>
      )}

      {!loading && !error && visibleBookings.length > 0 && (
        <section className="booking-list" aria-label="Your bookings">
          {visibleBookings.map((booking) => {
            const slot = booking.venue?.timeSlots?.find((item) => item.key === booking.slotKey);
            const date = booking.eventDate ? new Date(booking.eventDate).toLocaleDateString("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }) : "Date unavailable";
            return (
              <article className="booking-list-card" key={booking._id}>
                <div className="booking-list-main">
                  <div className="booking-list-title-row">
                    <h2>{booking.eventTitle}</h2>
                    <span className={`booking-status ${booking.status.toLowerCase()}`}>{booking.status}</span>
                  </div>
                  <p className="booking-venue-name">{booking.venue?.name || "Venue"}</p>
                  <div className="booking-meta">
                    <span>{date}</span>
                    <span>{slot?.label || booking.slotKey}</span>
                    <span>{booking.department}</span>
                  </div>
                </div>
                <Link to={`/bookings/${booking._id}`} className="booking-view-link">View Details →</Link>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default MyBookings;
