import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import "./BookingForm.css";

function BookingForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const eventDate = searchParams.get("date") || "";
  const slotKey = searchParams.get("slot") || "";
  const [venue, setVenue] = useState(null);
  const [form, setForm] = useState({
    eventTitle: "",
    department: "",
    expectedAttendees: "",
    eventDescription: "",
    facilitiesRequested: [],
    additionalRequirements: "",
  });
  const [step, setStep] = useState("form");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/auth/me")
      .catch((requestError) => {
        if (requestError.response?.status === 401) {
          navigate("/login", { state: { from: location }, replace: true });
        } else if (active) {
          setError(requestError.response?.data?.message || "Could not verify your session.");
        }
      })
      .finally(() => {
        if (active) setAuthChecking(false);
      });
    return () => { active = false; };
  }, [location, navigate]);

  useEffect(() => {
    let active = true;
    api.get(`/venues/${id}`)
      .then((response) => {
        if (active) setVenue(response.data.venue);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Could not load this venue.");
      });
    return () => { active = false; };
  }, [id]);

  const slot = venue?.timeSlots?.find((item) => item.key === slotKey);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleFacility(facility) {
    setForm((current) => ({
      ...current,
      facilitiesRequested: current.facilitiesRequested.includes(facility)
        ? current.facilitiesRequested.filter((item) => item !== facility)
        : [...current.facilitiesRequested, facility],
    }));
  }

  async function submitRequest() {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/bookings", {
        venueSlug: id,
        eventTitle: form.eventTitle,
        department: form.department,
        eventDate,
        slotKey,
        expectedAttendees: Number(form.expectedAttendees),
        eventDescription: form.eventDescription,
        facilitiesRequested: form.facilitiesRequested,
        additionalRequirements: form.additionalRequirements,
      });
      setBooking(response.data.booking);
      setStep("confirmed");
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate("/login", { state: { from: location }, replace: true });
        return;
      }
      setError(requestError.response?.data?.message || "The request could not be submitted. Please try again.");
      if (requestError.response?.status === 409) setStep("form");
    } finally {
      setLoading(false);
    }
  }

  if (!eventDate || !slotKey) {
    return (
      <main className="booking-page">
        <section className="booking-panel">
          <h1>Select a date and time first</h1>
          <p>Choose an available slot before starting a booking request.</p>
          <Link className="booking-primary-link" to={`/venues/${id}/availability`}>Check availability</Link>
        </section>
      </main>
    );
  }

  if (authChecking) {
    return <main className="booking-page"><section className="booking-panel" aria-live="polite">Checking your sign-in…</section></main>;
  }

  return (
    <main className="booking-page">
      <Link to={`/venues/${id}/availability?date=${encodeURIComponent(eventDate)}`} className="booking-back">← Back to Availability</Link>
      <section className="booking-panel">
        <span className="booking-eyebrow">BOOKING REQUEST</span>

        {step === "confirmed" ? (
          <div className="booking-confirmation" role="status">
            <div className="confirmation-check">✓</div>
            <h1>Request Submitted</h1>
            <p>Your request is pending approval. The slot is not reserved until an authorized approver approves it.</p>
            <div className="booking-reference">
              <span>Booking Reference</span>
              <strong>{booking?._id}</strong>
            </div>
            <div className="review-details">
              <p><strong>Venue</strong><span>{venue?.name}</span></p>
              <p><strong>Event</strong><span>{booking?.eventTitle}</span></p>
              <p><strong>Date and time</strong><span>{eventDate} · {slot?.label || slotKey}</span></p>
              <p><strong>Status</strong><span className="pending-badge">Pending approval</span></p>
            </div>
            <Link to="/" className="booking-primary-link">Back to Home</Link>
          </div>
        ) : (
          <>
            <h1>{step === "review" ? "Review Your Booking" : `Book ${venue?.name || "Venue"}`}</h1>
            <p className="booking-intro">{step === "review" ? "Check the details before submitting your request." : "Complete the event information. An authorized approver will review your request."}</p>

            <div className="booking-summary-strip">
              <div><span>Venue</span><strong>{venue?.name || id}</strong></div>
              <div><span>Date</span><strong>{eventDate}</strong></div>
              <div><span>Time Slot</span><strong>{slot?.label || slotKey}</strong></div>
            </div>

            {step === "form" ? (
              <form onSubmit={(event) => { event.preventDefault(); setError(""); setStep("review"); }}>
                <label htmlFor="eventTitle">Event title *</label>
                <input id="eventTitle" name="eventTitle" value={form.eventTitle} onChange={updateField} minLength={3} maxLength={160} required />

                <label htmlFor="department">Organizing department / organization *</label>
                <input id="department" name="department" value={form.department} onChange={updateField} maxLength={120} required />

                <div className="booking-field-row">
                  <div>
                    <label htmlFor="expectedAttendees">Expected attendees *</label>
                    <input id="expectedAttendees" name="expectedAttendees" type="number" min="1" max={venue?.capacity || 100000} value={form.expectedAttendees} onChange={updateField} required />
                    {venue?.capacity && <small>Configured capacity: {venue.capacity}</small>}
                  </div>
                </div>

                <label htmlFor="eventDescription">Event description *</label>
                <textarea id="eventDescription" name="eventDescription" value={form.eventDescription} onChange={updateField} minLength={10} maxLength={4000} rows={4} required />

                {venue?.facilities?.length > 0 && (
                  <fieldset className="facility-options">
                    <legend>Facilities requested</legend>
                    {venue.facilities.map((facility) => (
                      <label key={facility} className="facility-option">
                        <input type="checkbox" checked={form.facilitiesRequested.includes(facility)} onChange={() => toggleFacility(facility)} />
                        {facility}
                      </label>
                    ))}
                  </fieldset>
                )}

                <label htmlFor="additionalRequirements">Additional requirements (optional)</label>
                <textarea id="additionalRequirements" name="additionalRequirements" value={form.additionalRequirements} onChange={updateField} maxLength={2000} rows={3} />

                {error && <p className="booking-error" role="alert">{error}</p>}
                <button className="booking-primary-button" type="submit">Review Booking →</button>
              </form>
            ) : (
              <>
                <div className="review-details">
                  <p><strong>Event title</strong><span>{form.eventTitle}</span></p>
                  <p><strong>Department / organization</strong><span>{form.department}</span></p>
                  <p><strong>Date and time</strong><span>{eventDate} · {slot?.label || slotKey}</span></p>
                  <p><strong>Expected attendees</strong><span>{form.expectedAttendees}</span></p>
                  <p><strong>Facilities</strong><span>{form.facilitiesRequested.join(", ") || "None selected"}</span></p>
                  <p><strong>Description</strong><span>{form.eventDescription}</span></p>
                  {form.additionalRequirements && <p><strong>Additional requirements</strong><span>{form.additionalRequirements}</span></p>}
                </div>
                {error && <p className="booking-error" role="alert">{error}</p>}
                <div className="review-actions">
                  <button className="booking-secondary-button" type="button" onClick={() => setStep("form")} disabled={loading}>Back / Edit</button>
                  <button className="booking-primary-button" type="button" onClick={submitRequest} disabled={loading}>{loading ? "Submitting…" : "Submit Booking Request"}</button>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default BookingForm;
