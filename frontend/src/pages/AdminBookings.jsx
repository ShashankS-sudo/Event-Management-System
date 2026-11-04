import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";

const statuses = ["PENDING", "CANCELLATION_EXCEPTIONS", "APPROVED", "REJECTED", "CANCELLED", "ALL"];

function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = statuses.includes(searchParams.get("status")) ? searchParams.get("status") : "PENDING";
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/admin/bookings", { params: { status } })
      .then((response) => { if (active) setBookings(response.data.bookings); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load booking requests."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, reloadKey]);

  const chosenSlot = useMemo(
    () => selected?.venue?.timeSlots?.find((slot) => slot.key === selected.slotKey),
    [selected]
  );

  async function decide(decision) {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await api.patch(`/bookings/${selected._id}/decision`, {
        decision,
        ...(decision === "REJECTED" ? { reason: rejectionReason } : {}),
      });
      const autoRejectedCount = response.data.autoRejectedIds?.length || 0;
      setNotice(decision === "APPROVED"
        ? `Booking approved.${autoRejectedCount ? ` ${autoRejectedCount} conflicting request(s) were rejected.` : ""}`
        : "Booking rejected and the reason recorded.");
      setSelected(null);
      setRejectionReason("");
      setLoading(true);
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save the decision.");
    } finally {
      setSubmitting(false);
    }
  }

  async function decideException(decision) {
    if (!selected) return;
    setSubmitting(true); setError(""); setNotice("");
    try {
      await api.patch(`/bookings/${selected._id}/cancellation-exception/decision`, { decision, ...(decision === "REJECTED" ? { reason: rejectionReason } : {}) });
      setNotice(`Cancellation request ${decision.toLowerCase()}.`); setSelected(null); setRejectionReason(""); setLoading(true); setReloadKey((current) => current + 1);
    } catch (requestError) { setError(requestError.response?.data?.message || "Could not save the exception decision."); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading"><div><span className="admin-eyebrow">BOOKING MANAGEMENT</span><h1>Approval Queue</h1><p>Review requests and record an approval decision.</p></div><button className="admin-refresh" type="button" onClick={() => { setLoading(true); setError(""); setReloadKey((current) => current + 1); }} disabled={loading}>Refresh</button></div>
      <div className="admin-status-tabs" role="tablist" aria-label="Filter booking requests">
        {statuses.map((item) => <button type="button" key={item} role="tab" aria-selected={status === item} className={status === item ? "active" : ""} onClick={() => { setLoading(true); setError(""); setSearchParams(item === "PENDING" ? {} : { status: item }); }}>{item === "ALL" ? "All requests" : item === "CANCELLATION_EXCEPTIONS" ? "Cancellations" : `${item[0]}${item.slice(1).toLowerCase()}`}</button>)}
      </div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading && <p className="admin-state">Loading booking requests…</p>}
      {!loading && !error && bookings.length === 0 && <p className="admin-empty">No {status === "ALL" ? "booking" : status.toLowerCase()} requests found.</p>}
      {!loading && bookings.length > 0 && (
        <section className="admin-booking-list" aria-label="Booking requests">
          {bookings.map((booking) => {
            const date = new Date(booking.eventDate).toLocaleDateString("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
            const slotLabel = booking.venue?.timeSlots?.find((slot) => slot.key === booking.slotKey)?.label || booking.slotKey;
            return <article key={booking._id} className="admin-booking-row">
              <div className="admin-booking-info"><div className="admin-booking-title"><h2>{booking.eventTitle}</h2><span className={`admin-status ${booking.status.toLowerCase()}`}>{status === "CANCELLATION_EXCEPTIONS" ? "CANCELLATION REQUEST" : booking.status}</span></div><p>{booking.venue?.name} · {booking.requester?.name || "Customer"}</p><small>{date} · {slotLabel} · {booking.expectedAttendees} expected</small></div>
              <button className="admin-review-button" type="button" onClick={() => { setSelected(booking); setRejectionReason(""); }}>Review</button>
            </article>;
          })}
        </section>
      )}

      {selected && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setSelected(null); }}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
            <button className="admin-modal-close" type="button" aria-label="Close booking details" onClick={() => setSelected(null)} disabled={submitting}>×</button>
            <span className="admin-eyebrow">{selected._id}</span>
            <h2 id="admin-modal-title">{selected.eventTitle}</h2>
            <div className="admin-modal-details">
              <p><strong>Venue</strong><span>{selected.venue?.name}</span></p>
              <p><strong>Organization</strong><span>{selected.contactDetails?.organization || selected.department}</span></p>
              <p><strong>Contact person</strong><span>{selected.contactDetails ? `${selected.contactDetails.name} · ${selected.contactDetails.phone} · ${selected.contactDetails.email}` : `${selected.requester?.name || "Customer"} · ${selected.requester?.email || ""}`}</span></p>
              <p><strong>Date and time</strong><span>{new Date(selected.eventDate).toLocaleDateString("en-IN", { timeZone: "UTC", dateStyle: "long" })} · {chosenSlot?.label || selected.slotKey}</span></p>
              <p><strong>Expected attendees</strong><span>{selected.expectedAttendees}</span></p>
              <p><strong>Facilities</strong><span>{selected.facilitiesRequested?.join(", ") || "None"}</span></p>
              <p className="admin-modal-wide"><strong>Description</strong><span>{selected.eventDescription}</span></p>
              {selected.additionalRequirements && <p className="admin-modal-wide"><strong>Additional requirements</strong><span>{selected.additionalRequirements}</span></p>}
              {selected.cancellationException?.status === "PENDING" && <p className="admin-modal-wide"><strong>Cancellation reason</strong><span>{selected.cancellationException.reason}</span></p>}
            </div>
            {selected.cancellationException?.status === "PENDING" ? (
              <div className="admin-decision-actions"><label htmlFor="rejection-reason">Reason (required to decline)</label><textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} minLength={3} maxLength={1000} rows={3} placeholder="Explain why this cancellation cannot be approved" /><div><button className="admin-reject-button" type="button" onClick={() => decideException("REJECTED")} disabled={submitting || rejectionReason.trim().length < 3}>{submitting ? "Saving…" : "Decline Request"}</button><button className="admin-approve-button" type="button" onClick={() => decideException("APPROVED")} disabled={submitting}>{submitting ? "Saving…" : "Approve Cancellation"}</button></div></div>
            ) : selected.status === "PENDING" && status !== "CANCELLATION_EXCEPTIONS" && (
              <div className="admin-decision-actions">
                <label htmlFor="rejection-reason">Rejection reason (required to reject)</label>
                <textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} minLength={3} maxLength={1000} rows={3} placeholder="Explain why this request cannot be approved" />
                <div><button className="admin-reject-button" type="button" onClick={() => decide("REJECTED")} disabled={submitting || rejectionReason.trim().length < 3}>{submitting ? "Saving…" : "Reject"}</button><button className="admin-approve-button" type="button" onClick={() => decide("APPROVED")} disabled={submitting}>{submitting ? "Saving…" : "Approve Booking"}</button></div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default AdminBookings;
