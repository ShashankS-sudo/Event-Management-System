import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";

function campusToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function AdminAvailability() {
  const { user } = useOutletContext();
  const [venues, setVenues] = useState([]);
  const [venueSlug, setVenueSlug] = useState("");
  const [date, setDate] = useState(campusToday);
  const [availabilityRecord, setAvailabilityRecord] = useState(null);
  const [slotError, setSlotError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [error, setError] = useState("");
  const queryKey = `${venueSlug}|${date}`;
  const availability = availabilityRecord?.key === queryKey ? availabilityRecord.data : null;
  const loadingSlots = Boolean(venueSlug && date && !availability && slotError?.key !== queryKey);
  const currentSlotError = slotError?.key === queryKey ? slotError.message : "";

  useEffect(() => {
    let active = true;
    api.get("/venues").then((response) => {
      if (!active) return;
      const allVenues = response.data.venues || [];
      const scopedVenues = user.role === "HOD" ? allVenues.filter((venue) => venue.slug === "cse-seminar-hall") : allVenues;
      setVenues(scopedVenues);
      if (scopedVenues.length) setVenueSlug(scopedVenues[0].slug);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || "Could not load venue records.");
    }).finally(() => { if (active) setLoadingVenues(false); });
    return () => { active = false; };
  }, [user.role]);

  useEffect(() => {
    if (!venueSlug || !date) return undefined;
    const controller = new AbortController();
    api.get(`/venues/${venueSlug}/availability`, { params: { date }, signal: controller.signal })
      .then((response) => { setAvailabilityRecord({ key: queryKey, data: response.data.availability }); setSlotError(null); })
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") setSlotError({ key: queryKey, message: requestError.response?.data?.message || "Could not load venue availability." });
      });
    return () => controller.abort();
  }, [venueSlug, date, queryKey, refreshKey]);

  const formattedDate = useMemo(() => date ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", dateStyle: "long" }) : "", [date]);

  return (
    <main className="admin-content">
      <div className="admin-page-heading"><div><span className="admin-eyebrow">SCHEDULE OVERVIEW</span><h1>Venue Availability</h1><p>Review current reservations and blocked periods by venue and date.</p></div></div>
      <section className="admin-section admin-availability-controls">
        {loadingVenues ? <p className="admin-state">Loading venues…</p> : venues.length === 0 ? <p className="admin-empty">No active venues are available for this role.</p> : <div>
          <label>Venue<select value={venueSlug} onChange={(event) => setVenueSlug(event.target.value)}>{venues.map((venue) => <option key={venue._id} value={venue.slug}>{venue.name}</option>)}</select></label>
          <label>Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        </div>}
        {(error || currentSlotError) && <p className="admin-error" role="alert">{error || currentSlotError}</p>}
      </section>
      {loadingSlots && <p className="admin-state">Loading availability…</p>}
      {availability && !loadingSlots && <section className="admin-section"><div className="admin-section-heading"><div><h2>{availability.venue.name}</h2><p>{formattedDate} · Campus time (Asia/Kolkata)</p></div><button type="button" className="admin-refresh" onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingSlots}>Refresh</button></div>
        <div className="admin-availability-slots">{availability.slots.map((slot) => <article className="admin-availability-slot" key={slot.key}><div><strong>{slot.label}</strong><small>{slot.status === "CLOSED" ? "Not scheduled" : slot.status}</small></div><span className={`availability-chip ${slot.status.toLowerCase()}`}>{slot.status}</span></article>)}</div>
        {availability.slots.length === 0 && <p className="admin-empty">No slots have been configured for this venue.</p>}
        <p className="admin-availability-note">Pending booking requests do not reserve slots. Approved reservations include the configured cleaning buffer.</p>
      </section>}
    </main>
  );
}

export default AdminAvailability;
