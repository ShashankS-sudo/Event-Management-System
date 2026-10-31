import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";

function AdminManualBookings() {
  const { user } = useOutletContext();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [form, setForm] = useState({
    venueSlug: "",
    eventTitle: "",
    department: "",
    eventDate: "",
    slotKey: "",
    expectedAttendees: "",
    eventDescription: "",
    additionalRequirements: "",
  });

  useEffect(() => {
    let active = true;
    api.get("/venues")
      .then((response) => {
        if (!active) return;
        setVenues(response.data.venues);
        const firstVenue = response.data.venues[0];
        if (firstVenue) setForm((current) => ({ ...current, venueSlug: firstVenue.slug, slotKey: firstVenue.timeSlots?.[0]?.key || "" }));
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load venues."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const venue = venues.find((item) => item.slug === form.venueSlug);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "venueSlug") {
      const nextVenue = venues.find((item) => item.slug === value);
      setForm((current) => ({ ...current, venueSlug: value, slotKey: nextVenue?.timeSlots?.[0]?.key || "" }));
      setFacilities([]);
    }
  }

  function toggleFacility(name) {
    setFacilities((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await api.post("/admin/manual-bookings", {
        ...form,
        expectedAttendees: Number(form.expectedAttendees),
        facilitiesRequested: facilities,
      });
      const rejectedCount = response.data.autoRejectedIds?.length || 0;
      setNotice(`Manual reservation created (${response.data.booking._id}).${rejectedCount ? ` ${rejectedCount} conflicting pending request(s) were rejected and notified.` : ""}`);
      setForm((current) => ({ ...current, eventTitle: "", department: "", eventDate: "", expectedAttendees: "", eventDescription: "", additionalRequirements: "" }));
      setFacilities([]);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not create the manual reservation.");
    } finally {
      setSaving(false);
    }
  }

  if (user.role !== "ADMIN") return <main className="admin-content"><p className="admin-error">Only ADMIN users can create manual reservations.</p></main>;

  return (
    <main className="admin-content">
      <div className="admin-page-heading"><div><span className="admin-eyebrow">ADMINISTRATIVE RESERVATION</span><h1>Create Manual Booking</h1><p>Reserve a venue for an internal event. Manual reservations follow the same conflict and cleaning-buffer rules.</p></div></div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      <section className="admin-section admin-manual-section" aria-busy={loading}>
        {loading ? <p className="admin-state">Loading venues…</p> : venues.length === 0 ? <p className="admin-empty">No active venues are configured yet.</p> : (
          <form className="admin-manual-form" onSubmit={submit}>
            <label>Venue<select name="venueSlug" value={form.venueSlug} onChange={updateField} required>{venues.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
            <label>Event title<input name="eventTitle" value={form.eventTitle} onChange={updateField} minLength={3} maxLength={160} required /></label>
            <label>Department / organization<input name="department" value={form.department} onChange={updateField} maxLength={120} required /></label>
            <div className="admin-manual-row">
              <label>Date<input name="eventDate" type="date" value={form.eventDate} onChange={updateField} required /></label>
              <label>Time slot<select name="slotKey" value={form.slotKey} onChange={updateField} required>{(venue?.timeSlots || []).map((slot) => <option key={slot.key} value={slot.key}>{slot.label}</option>)}</select></label>
              <label>Expected attendees<input name="expectedAttendees" type="number" min="1" max={venue?.capacity || 100000} value={form.expectedAttendees} onChange={updateField} required /></label>
            </div>
            {venue?.capacity && <p className="admin-block-note">Configured capacity: {venue.capacity}</p>}
            <label>Event description<textarea name="eventDescription" value={form.eventDescription} onChange={updateField} minLength={10} maxLength={4000} rows={4} required /></label>
            {venue?.facilities?.length > 0 && <fieldset className="admin-facility-options"><legend>Facilities requested</legend>{venue.facilities.map((facility) => <label key={facility}><input type="checkbox" checked={facilities.includes(facility)} onChange={() => toggleFacility(facility)} />{facility}</label>)}</fieldset>}
            <label>Additional requirements (optional)<textarea name="additionalRequirements" value={form.additionalRequirements} onChange={updateField} maxLength={2000} rows={3} /></label>
            <div className="admin-manual-note">This creates an approved reservation immediately and blocks the slot plus one hour for cleaning. Any conflicting pending customer requests will be rejected and notified.</div>
            <button className="admin-primary-link admin-submit-block" type="submit" disabled={saving || !form.slotKey}>{saving ? "Creating reservation…" : "Create Manual Reservation"}</button>
          </form>
        )}
      </section>
    </main>
  );
}

export default AdminManualBookings;
