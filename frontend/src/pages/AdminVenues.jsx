import { useEffect, useState } from "react";
import api from "../services/api";

function toMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function blankForm() {
  return { name: "", slug: "", type: "", description: "", department: "", location: "", capacity: "", facilities: "", timeSlots: "", operatingHours: "", isActive: true };
}

function formFromVenue(venue) {
  return {
    name: venue.name, slug: venue.slug, type: venue.type, description: venue.description || "", department: venue.department || "", location: venue.location || "", capacity: venue.capacity || "", facilities: (venue.facilities || []).join(", "),
    timeSlots: (venue.timeSlots || []).map((slot) => `${slot.key}|${slot.label}|${fromMinutes(slot.startMinute)}|${fromMinutes(slot.endMinute)}`).join("\n"),
    operatingHours: (venue.operatingHours || []).map((hours) => hours.isClosed ? `${hours.dayOfWeek}|CLOSED` : `${hours.dayOfWeek}|${fromMinutes(hours.opensAtMinute)}|${fromMinutes(hours.closesAtMinute)}`).join("\n"),
    isActive: venue.isActive,
  };
}

function parseForm(form) {
  const timeSlots = form.timeSlots.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [key, label, start, end] = line.split("|").map((part) => part.trim());
    if (!key || !label || !/^\d{2}:\d{2}$/.test(start || "") || !/^\d{2}:\d{2}$/.test(end || "")) throw new Error("Time slot lines use key|label|HH:MM|HH:MM.");
    return { key, label, startMinute: toMinutes(start), endMinute: toMinutes(end) };
  });
  const operatingHours = form.operatingHours.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [day, opens, closes] = line.split("|").map((part) => part.trim());
    const dayOfWeek = Number(day);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) throw new Error("Operating hours use day numbers 0–6, where 0 is Sunday.");
    if (opens?.toUpperCase() === "CLOSED" && !closes) return { dayOfWeek, isClosed: true };
    if (!/^\d{2}:\d{2}$/.test(opens || "") || !/^\d{2}:\d{2}$/.test(closes || "")) throw new Error("Open-day lines use day|HH:MM|HH:MM; closed-day lines use day|CLOSED.");
    return { dayOfWeek, isClosed: false, opensAtMinute: toMinutes(opens), closesAtMinute: toMinutes(closes) };
  });
  const capacity = form.capacity.trim() ? Number(form.capacity) : null;
  if (capacity != null && !Number.isInteger(capacity)) throw new Error("Capacity must be a whole number.");
  return { name: form.name, slug: form.slug, type: form.type, description: form.description, department: form.department, location: form.location, capacity, facilities: form.facilities.split(",").map((item) => item.trim()).filter(Boolean), timeSlots, operatingHours, isActive: form.isActive };
}

function AdminVenues() {
  const [venues, setVenues] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/admin/venues").then((response) => { if (active) setVenues(response.data.venues); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load venue records."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  async function saveVenue(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const payload = parseForm(form);
      const response = editingId ? await api.patch(`/admin/venues/${editingId}`, payload) : await api.post("/admin/venues", payload);
      setNotice(`${response.data.venue.name} saved.`); setEditingId(""); setForm(blankForm()); setLoading(true); setReload((value) => value + 1);
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.message || "Could not save this venue."); }
    finally { setSaving(false); }
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading"><div><span className="admin-eyebrow">VENUE CONFIGURATION</span><h1>Venues and Slots</h1><p>Maintain authoritative venue records used by public browsing and booking availability.</p></div></div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}{error && <p className="admin-error" role="alert">{error}</p>}
      <section className="admin-section admin-venue-editor">
        <div className="admin-section-heading"><div><h2>{editingId ? "Edit Venue" : "Add Venue"}</h2><p>Capacity, facilities, hours, and slots should match approved SJBIT information.</p></div>{editingId && <button type="button" className="admin-refresh" onClick={() => { setEditingId(""); setForm(blankForm()); }}>New venue</button>}</div>
        <form className="admin-venue-form" onSubmit={saveVenue}>
          <div className="admin-venue-grid">
            <label>Name<input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="cse-seminar-hall" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
            <label>Type<input required maxLength={80} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></label>
            <label>Capacity<input type="number" min="1" step="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} placeholder="Leave blank if unconfirmed" /></label>
            <label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
            <label>Department<input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
            <label className="admin-venue-wide">Description<textarea maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label className="admin-venue-wide">Facilities (comma separated)<input value={form.facilities} onChange={(event) => setForm({ ...form, facilities: event.target.value })} placeholder="Projector, Sound system" /></label>
            <label>Time slots<textarea rows={5} value={form.timeSlots} onChange={(event) => setForm({ ...form, timeSlots: event.target.value })} placeholder={'key|Label|Start|End\nmorning|09:00 - 12:00|09:00|12:00'} /><small>One per line: key|label|HH:MM|HH:MM</small></label>
            <label>Operating hours<textarea rows={5} value={form.operatingHours} onChange={(event) => setForm({ ...form, operatingHours: event.target.value })} placeholder={'1|09:00|17:00\n0|CLOSED'} /><small>One per line: day|open|close; 0 is Sunday, 6 is Saturday. Closed: day|CLOSED.</small></label>
          </div>
          <label className="admin-venue-active"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Publicly active</label>
          <div className="admin-decision-actions"><button className="admin-approve-button" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save Venue" : "Create Venue"}</button></div>
        </form>
      </section>
      <section className="admin-section"><div className="admin-section-heading"><div><h2>Managed venues</h2><p>{venues.length} venue record(s)</p></div></div>
        {loading && <p className="admin-state">Loading venue records…</p>}
        {!loading && venues.length === 0 && <p className="admin-empty">No venues configured yet. Add verified venue information above.</p>}
        <div className="admin-managed-venues">{venues.map((venue) => <article className="admin-managed-venue" key={venue._id}><div><strong>{venue.name}</strong><span>{venue.slug} · {venue.type} · {venue.isActive ? "Active" : "Inactive"}</span><small>{venue.timeSlots?.length || 0} time slots · {venue.facilities?.length || 0} facilities</small></div><button type="button" className="admin-review-button" onClick={() => { setEditingId(venue._id); setForm(formFromVenue(venue)); setError(""); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button></article>)}</div>
      </section>
    </main>
  );
}

export default AdminVenues;
