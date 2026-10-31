import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";

function formatCampusDateTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function minuteOfDay(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function AdminBlockedSlots() {
  const { user } = useOutletContext();
  const [venues, setVenues] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [form, setForm] = useState({ venueSlug: "", startDate: "", startTime: "", endDate: "", endTime: "", reason: "" });
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/venues"), api.get("/admin/blocked-slots")])
      .then(([venueResponse, blockResponse]) => {
        if (!active) return;
        const activeVenues = venueResponse.data.venues;
        setVenues(activeVenues);
        setBlocks(blockResponse.data.blockedSlots);
        setForm((current) => ({ ...current, venueSlug: current.venueSlug || activeVenues[0]?.slug || "" }));
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load blocked periods."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function createBlock(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    setConflicts([]);
    try {
      const response = await api.post("/admin/blocked-slots", {
        venueSlug: form.venueSlug,
        startDate: form.startDate,
        startMinute: minuteOfDay(form.startTime),
        endDate: form.endDate,
        endMinute: minuteOfDay(form.endTime),
        reason: form.reason,
      });
      const rejectedCount = response.data.autoRejectedIds?.length || 0;
      setNotice(`Blocked period saved.${rejectedCount ? ` ${rejectedCount} conflicting pending request(s) were rejected and notified.` : ""}`);
      setForm((current) => ({ ...current, startDate: "", startTime: "", endDate: "", endTime: "", reason: "" }));
      setLoading(true);
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save the blocked period.");
      setConflicts(requestError.response?.data?.conflicts || []);
    } finally {
      setSaving(false);
    }
  }

  async function removeBlock(id) {
    setError("");
    setNotice("");
    try {
      await api.delete(`/admin/blocked-slots/${id}`);
      setNotice("Blocked period removed.");
      setLoading(true);
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not remove the blocked period.");
    }
  }

  if (user.role !== "ADMIN") {
    return <main className="admin-content"><p className="admin-error">Only ADMIN users can manage blocked periods.</p></main>;
  }

  return (
    <main className="admin-content">
      <div className="admin-page-heading"><div><span className="admin-eyebrow">VENUE MANAGEMENT</span><h1>Blocked Slots</h1><p>Set unavailable periods for maintenance, college events, or other operational needs.</p></div></div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {conflicts.length > 0 && <section className="admin-conflict-list"><h2>Existing reservations conflict with this period</h2><p>Adjust the blocked time to avoid overwriting approved bookings.</p>{conflicts.map((conflict) => <p key={String(conflict.bookingId)}><strong>{conflict.eventTitle}</strong><span>{formatCampusDateTime(conflict.startAt)} – {formatCampusDateTime(conflict.endAt)}</span></p>)}</section>}

      <section className="admin-section admin-block-form-section">
        <h2>Create blocked period</h2>
        <form className="admin-block-form" onSubmit={createBlock}>
          <label>Venue<select name="venueSlug" value={form.venueSlug} onChange={updateField} required>{venues.map((venue) => <option key={venue.slug} value={venue.slug}>{venue.name}</option>)}</select></label>
          <div className="admin-block-time-row">
            <label>Start date<input name="startDate" type="date" value={form.startDate} onChange={updateField} required /></label>
            <label>Start time<input name="startTime" type="time" value={form.startTime} onChange={updateField} required /></label>
            <label>End date<input name="endDate" type="date" value={form.endDate} onChange={updateField} required /></label>
            <label>End time<input name="endTime" type="time" value={form.endTime} onChange={updateField} required /></label>
          </div>
          <label>Reason<input name="reason" value={form.reason} onChange={updateField} minLength={3} maxLength={500} placeholder="e.g. Maintenance work" required /></label>
          <button className="admin-primary-link admin-submit-block" type="submit" disabled={saving || loading || venues.length === 0}>{saving ? "Saving…" : "Save Blocked Period"}</button>
        </form>
        <p className="admin-block-note">Times are interpreted in SJBIT campus time (Asia/Kolkata). The system will refuse to save a period that overlaps an approved reservation.</p>
      </section>

      <section className="admin-section admin-blocks-section">
        <div className="admin-section-heading"><div><h2>Active blocked periods</h2><p>Blocks do not receive an automatic cleaning buffer.</p></div><button className="admin-refresh" type="button" onClick={() => { setLoading(true); setReloadKey((current) => current + 1); }} disabled={loading}>Refresh</button></div>
        {loading && <p className="admin-state">Loading blocked periods…</p>}
        {!loading && !error && blocks.length === 0 && <p className="admin-empty">No active blocked periods.</p>}
        {!loading && blocks.length > 0 && <div className="admin-pending-list">{blocks.map((block) => <article className="admin-block-row" key={block._id}><div className="admin-block-info"><strong>{block.venue?.name}</strong><span>{formatCampusDateTime(block.startAt)} – {formatCampusDateTime(block.endAt)}</span><small>{block.reason} · Added by {block.createdBy?.name || "Admin"}</small></div><button className="admin-remove-block" type="button" onClick={() => removeBlock(block._id)}>Remove block</button></article>)}</div>}
      </section>
    </main>
  );
}

export default AdminBlockedSlots;
