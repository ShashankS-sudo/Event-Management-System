
import { useEffect, useState } from "react";
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

const minimumBookingDate = campusDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));

function Availability() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
  const startOptions = [...new Set((availability?.slots || []).filter((slot) => slot.status !== "CLOSED").map((slot) => slot.startMinute))];
  const endOptions = (availability?.slots || []).filter((slot) => String(slot.startMinute) === selectedStart);

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
        <p className="availability-description">Choose a date and a continuous hourly range. A one-hour cleanup buffer is applied after approved bookings.</p>

        <div className="selected-venue">
          <span>Selected Venue</span>
          <h2>{availability?.venue.name || id.replaceAll("-", " ")}</h2>
        </div>

        <label htmlFor="booking-date">Choose a Date</label>
        <input
          id="booking-date"
          type="date"
          min={minimumBookingDate}
          value={selectedDate}
          onChange={(event) => {
            setSelectedDate(event.target.value);
            setAvailability(null);
            setSelectedSlot("");
            setSelectedStart("");
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
            <h2 className="slots-heading">Choose your booking time</h2>
            <p className="slots-note">Select the start and end time. Requests can cover one or more consecutive hourly periods. Pending requests do not reserve a slot.</p>
            {availability.slots.length > 0 ? <div className="range-selectors">
              <label htmlFor="start-time">Start time<select id="start-time" value={selectedStart} onChange={(event) => { setSelectedStart(event.target.value); setSelectedSlot(""); }}><option value="">Choose a start</option>{startOptions.map((minute) => { const option = availability.slots.find((slot) => slot.startMinute === minute); return <option key={minute} value={minute}>{option?.label.split(" – ")[0]}</option>; })}</select></label>
              <label htmlFor="end-time">End time<select id="end-time" value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)} disabled={!selectedStart}><option value="">Choose an end</option>{endOptions.map((slot) => <option key={slot.key} value={slot.key} disabled={slot.status !== "AVAILABLE"}>{slot.label.split(" – ")[1]} · {slot.status}</option>)}</select></label>
              {chosenSlot && <p className={`range-status ${chosenSlot.status.toLowerCase()}`}>Selected range: {chosenSlot.label} · {chosenSlot.status}</p>}
            </div> : <p className="slots-note">No hourly booking ranges have been configured for this venue yet.</p>}
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
