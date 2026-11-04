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
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [showResubmit, setShowResubmit] = useState(false);
  const [resubmitForm, setResubmitForm] = useState(null);
  const [exceptionReason, setExceptionReason] = useState("");
  const [showExceptionForm, setShowExceptionForm] = useState(false);
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

  async function cancelBooking() {
    if (!window.confirm("Cancel this booking request?")) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await api.patch(`/bookings/${id}/cancel`);
      setBooking(response.data.booking);
      setNotice("Booking cancelled.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not cancel this booking.");
    } finally {
      setWorking(false);
    }
  }

  async function requestLateCancellation(event) {
    event.preventDefault();
    setWorking(true); setError(""); setNotice("");
    try {
      const response = await api.post(`/bookings/${id}/cancellation-exception`, { reason: exceptionReason });
      setBooking(response.data.booking); setShowExceptionForm(false); setNotice("Cancellation request sent to approvers for review.");
    } catch (requestError) { setError(requestError.response?.data?.message || "Could not request a late cancellation."); }
    finally { setWorking(false); }
  }

  async function resubmitBooking(event) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const response = await api.post(`/bookings/${id}/resubmit`, {
        ...resubmitForm,
        expectedAttendees: Number(resubmitForm.expectedAttendees),
        facilitiesRequested: booking.facilitiesRequested || [],
      });
      navigate(`/bookings/${response.data.booking._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not resubmit this booking.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="bookings-page">
      <Link to="/bookings" className="bookings-back">← Back to My Bookings</Link>
      {loading && <p className="bookings-state" aria-live="polite">Loading booking details…</p>}
      {error && <p className="bookings-error" role="alert">{error}</p>}
      {notice && <p className="booking-action-notice" role="status">{notice}</p>}
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
            <p><strong>Organization</strong><span>{booking.contactDetails?.organization || booking.department}</span></p>
            {booking.contactDetails && <p><strong>Contact person</strong><span>{booking.contactDetails.name} · {booking.contactDetails.phone} · {booking.contactDetails.email}</span></p>}
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
          <div className="booking-owner-actions">
            {booking.source === "REQUEST" && ["PENDING", "APPROVED"].includes(booking.status) && <button type="button" className="booking-cancel-button" onClick={cancelBooking} disabled={working}>{working ? "Working…" : "Cancel Booking"}</button>}
            {booking.source === "REQUEST" && ["PENDING", "APPROVED"].includes(booking.status) && (!booking.cancellationException || booking.cancellationException.status === "NONE") && <button type="button" className="booking-resubmit-button" onClick={() => setShowExceptionForm((value) => !value)}>Request Late Cancellation</button>}
            {booking.cancellationException?.status && booking.cancellationException.status !== "NONE" && <span className={`booking-status ${booking.cancellationException.status.toLowerCase()}`}>Late cancellation: {booking.cancellationException.status}</span>}
            {booking.source === "REQUEST" && booking.status === "REJECTED" && !showResubmit && <button type="button" className="booking-resubmit-button" onClick={() => { setResubmitForm({ eventTitle: booking.eventTitle, department: booking.department, contactDetails: { name: booking.contactDetails?.name || "", phone: booking.contactDetails?.phone || "", email: booking.contactDetails?.email || "", organization: booking.contactDetails?.organization || booking.department || "" }, eventDate: new Date(booking.eventDate).toISOString().slice(0, 10), slotKey: booking.slotKey, expectedAttendees: String(booking.expectedAttendees), eventDescription: booking.eventDescription, additionalRequirements: booking.additionalRequirements || "" }); setShowResubmit(true); setError(""); }}>Edit and Resubmit</button>}
          </div>
          {showExceptionForm && <form className="booking-resubmit-form" onSubmit={requestLateCancellation}><h2>Request Late Cancellation</h2><p>Approvers will review the reason. An approved request cancels the booking and releases its reserved slot.</p><label>Reason<textarea value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} minLength={10} maxLength={1000} rows={4} required placeholder="Explain why the booking needs to be cancelled after the cutoff" /></label><div className="booking-owner-actions"><button type="button" className="booking-cancel-button" onClick={() => setShowExceptionForm(false)} disabled={working}>Back</button><button type="submit" className="booking-resubmit-button" disabled={working || exceptionReason.trim().length < 10}>{working ? "Sending…" : "Send Request"}</button></div></form>}
          {showResubmit && resubmitForm && (
            <form className="booking-resubmit-form" onSubmit={resubmitBooking}>
              <h2>Edit and Resubmit Request</h2>
              <label>Event title<input value={resubmitForm.eventTitle} onChange={(event) => setResubmitForm({ ...resubmitForm, eventTitle: event.target.value })} minLength={3} maxLength={160} required /></label>
              <label>Department / organization<input value={resubmitForm.department} onChange={(event) => setResubmitForm({ ...resubmitForm, department: event.target.value })} maxLength={120} required /></label>
              <div className="resubmit-row"><label>Contact person<input value={resubmitForm.contactDetails.name} onChange={(event) => setResubmitForm({ ...resubmitForm, contactDetails: { ...resubmitForm.contactDetails, name: event.target.value } })} minLength={2} required /></label><label>Phone<input type="tel" value={resubmitForm.contactDetails.phone} onChange={(event) => setResubmitForm({ ...resubmitForm, contactDetails: { ...resubmitForm.contactDetails, phone: event.target.value } })} required /></label><label>Contact email<input type="email" value={resubmitForm.contactDetails.email} onChange={(event) => setResubmitForm({ ...resubmitForm, contactDetails: { ...resubmitForm.contactDetails, email: event.target.value } })} required /></label><label>Organization<input value={resubmitForm.contactDetails.organization} onChange={(event) => setResubmitForm({ ...resubmitForm, contactDetails: { ...resubmitForm.contactDetails, organization: event.target.value } })} minLength={2} required /></label></div>
              <div className="resubmit-row">
                <label>Event date<input type="date" value={resubmitForm.eventDate} onChange={(event) => setResubmitForm({ ...resubmitForm, eventDate: event.target.value })} required /></label>
                <label>Time slot<select value={resubmitForm.slotKey} onChange={(event) => setResubmitForm({ ...resubmitForm, slotKey: event.target.value })} required>{booking.venue?.timeSlots?.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
                <label>Expected attendees<input type="number" min="1" max="100000" value={resubmitForm.expectedAttendees} onChange={(event) => setResubmitForm({ ...resubmitForm, expectedAttendees: event.target.value })} required /></label>
              </div>
              <label>Event description<textarea value={resubmitForm.eventDescription} onChange={(event) => setResubmitForm({ ...resubmitForm, eventDescription: event.target.value })} minLength={10} maxLength={4000} rows={4} required /></label>
              <label>Additional requirements<textarea value={resubmitForm.additionalRequirements} onChange={(event) => setResubmitForm({ ...resubmitForm, additionalRequirements: event.target.value })} maxLength={2000} rows={3} /></label>
              <div className="booking-owner-actions"><button type="button" className="booking-cancel-button" onClick={() => setShowResubmit(false)} disabled={working}>Discard Edits</button><button type="submit" className="booking-resubmit-button" disabled={working}>{working ? "Submitting…" : "Submit Revised Request"}</button></div>
            </form>
          )}
        </section>
      )}
    </main>
  );
}

export default BookingDetails;
