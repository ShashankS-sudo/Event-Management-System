import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api from "../services/api";

function AdminDashboard() {
  const { user } = useOutletContext();
  const [pending, setPending] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get("/admin/bookings", { params: { status: "PENDING" } })
      .then((response) => { if (active) setPending(response.data.bookings.slice(0, 5)); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load pending requests."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="admin-content">
      <div className="admin-page-heading">
        <div><span className="admin-eyebrow">SJBIT VENUE BOOKING SYSTEM</span><h1>Administration Dashboard</h1><p>Welcome, {user.name}. Review booking requests assigned to your role.</p></div>
        <div className="admin-dashboard-actions"><Link to="/admin/bookings" className="admin-primary-link">Open Approval Queue →</Link>{user.role === "ADMIN" && <Link to="/admin/venues" className="admin-primary-link">Manage Venues →</Link>}</div>
      </div>
      <section className="admin-welcome-card">
        <div><span className="admin-icon">✓</span><div><strong>Approval workspace</strong><p>Each decision is checked against your venue permissions and current reservations.</p></div></div>
        <span className="admin-role-pill">{user.role === "HOD" ? "CSE Seminar Hall" : "All venues"}</span>
      </section>
      <section className="admin-section">
        <div className="admin-section-heading"><div><h2>Pending requests</h2><p>Requests awaiting an authorized decision.</p></div><Link to="/admin/bookings">View queue</Link></div>
        {loading && <p className="admin-state">Loading requests…</p>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        {!loading && !error && pending.length === 0 && <p className="admin-empty">No pending requests are currently assigned to you.</p>}
        {!loading && !error && pending.length > 0 && (
          <div className="admin-pending-list">
            {pending.map((booking) => (
              <article key={booking._id} className="admin-pending-row">
                <div className="admin-date-chip"><strong>{new Date(booking.eventDate).toLocaleDateString("en-IN", { timeZone: "UTC", day: "2-digit" })}</strong><span>{new Date(booking.eventDate).toLocaleDateString("en-IN", { timeZone: "UTC", month: "short" })}</span></div>
                <div className="admin-pending-copy"><strong>{booking.eventTitle}</strong><span>{booking.venue?.name} · {booking.requester?.name || "Customer"}</span></div>
                <Link to="/admin/bookings" className="admin-row-link">Review</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminDashboard;
