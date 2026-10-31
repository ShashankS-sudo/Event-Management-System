
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import "./Availability.css";

function campusDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function Availability() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const today = useMemo(() => campusDate(), []);

  useEffect(() => {
    if (!selectedDate) return undefined;

    const controller = new AbortController();

    api
      .get(`/venues/${id}/availability`, {
        params: { date: selectedDate },
        signal: controller.signal,
      })
      .then((response) => setAvailability(response.data.availability))
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setAvailability(null);
          setError(requestError.response?.data?.message || "Could not load availability. Please try again.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, selectedDate]);

  const chosenSlot = availability?.slots.find((slot) => slot.key === selectedSlot);

  function continueToBooking() {
    if (!chosenSlot || chosenSlot.status !== "AVAILABLE") return;
    navigate(`/venues/${id}/book?date=${encodeURIComponent(selectedDate)}&slot=${encodeURIComponent(chosenSlot.key)}`);
  }

  return (
    <main className="availability-page">
      <Link to={`/venues/${id}`} className="availability-back">
        ← Back to Venue Details
      </Link>

      <section className="availability-card" aria-busy={loading}>
        <span className="availability-eyebrow">BOOKING STEP 1</span>
        <h1>Check Availability</h1>
        <p className="availability-description">
          Select a date to see live slot availability for this venue.
        </p>

        <div className="selected-venue">
          <span>Selected Venue</span>
          <h2>{availability?.venue.name || id.replaceAll("-", " ")}</h2>
        </div>

        <label htmlFor="booking-date">Choose a Date</label>
        <input
          id="booking-date"
          type="date"
          min={today}
          value={selectedDate}
          onChange={(event) => {
            setSelectedDate(event.target.value);
            setAvailability(null);
            setSelectedSlot("");
            setError("");
            setLoading(Boolean(event.target.value));
          }}
          required
        />

        <div className="availability-state" aria-live="polite">
          {!selectedDate && <p className="slots-note">Choose a date to load the venue's configured slots.</p>}
          {loading && <p className="slots-note">Checking live availability…</p>}
          {error && <p className="availability-error" role="alert">{error}</p>}
        </div>

        {availability && !loading && (
          <>
            <h2 className="slots-heading">Time Slots</h2>
            <p className="slots-note">Pending requests do not reserve a slot. A booking is confirmed only after approval.</p>
            <div className="time-slot-list">
              {availability.slots.map((slot) => {
                const selectable = slot.status === "AVAILABLE";
                return (
                  <button
                    key={slot.key}
                    type="button"
                    className={`time-slot ${selectedSlot === slot.key ? "selected" : ""} ${slot.status.toLowerCase()}`}
                    disabled={!selectable}
                    aria-pressed={selectedSlot === slot.key}
                    onClick={() => setSelectedSlot(slot.key)}
                  >
                    <span>{slot.label}</span>
                    <span className="slot-status">{slot.status === "CLOSED" ? "Not scheduled" : slot.status}</span>
                  </button>
                );
              })}
              {availability.slots.length === 0 && <p className="slots-note">No time slots have been configured for this venue yet.</p>}
            </div>
            <div className="availability-legend" aria-label="Availability status key">
              <span><i className="legend-dot available-dot" />Available</span>
              <span><i className="legend-dot booked-dot" />Booked</span>
              <span><i className="legend-dot blocked-dot" />Blocked</span>
              <span><i className="legend-dot closed-dot" />Not scheduled</span>
            </div>
          </>
        )}

        <div className="availability-actions">
          <Link to={`/venues/${id}`} className="availability-secondary">Back</Link>
          <button
            type="button"
            className="availability-primary"
            disabled={!chosenSlot || chosenSlot.status !== "AVAILABLE" || loading}
            onClick={continueToBooking}
          >
            Continue →
          </button>
        </div>
      </section>
    </main>
  );
}

export default Availability;
