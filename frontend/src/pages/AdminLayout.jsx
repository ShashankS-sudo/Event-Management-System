import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import useAuth from "../context/useAuth";
import "./Admin.css";

const adminRoles = ["ADMIN", "HOD", "PRINCIPAL"];

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/auth/me")
      .then((response) => {
        if (!active) return;
        const currentUser = response.data.user;
        const department = (currentUser.department || "").trim().toUpperCase();
        const isAssignedHod = currentUser.role === "HOD" && [
          "CSE",
          "COMPUTER SCIENCE AND ENGINEERING",
          "COMPUTER SCIENCE & ENGINEERING",
        ].includes(department);
        if (!adminRoles.includes(currentUser.role) || (currentUser.role === "HOD" && !isAssignedHod)) {
          setError("This area is for authorized administrators and approvers.");
          return;
        }
        setUser(currentUser);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.response?.status === 401) {
          navigate("/login", { state: { from: location }, replace: true });
        } else {
          setError(requestError.response?.data?.message || "Could not verify your access.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [location, navigate, setUser]);

  async function handleLogout() {
    try { await logout(); navigate("/", { replace: true }); }
    catch { setError("Could not sign out. Please try again."); }
  }

  if (loading) return <main className="admin-loading">Checking administrator access…</main>;
  if (error) {
    return (
      <main className="admin-loading">
        <section className="admin-access-error"><h1>Access unavailable</h1><p>{error}</p><Link to="/">Return to the public site</Link></section>
      </main>
    );
  }
  if (!user) return null;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link to="/admin/dashboard" className="admin-brand"><span className="admin-brand-mark">S</span><span><strong>SJBIT</strong><small>Administration</small></span></Link>
        <nav className="admin-nav" aria-label="Administrative navigation">
          <NavLink to="/admin/dashboard">Dashboard</NavLink>
          <NavLink to="/admin/bookings">Booking Requests</NavLink>
          <NavLink to="/admin/availability">Availability</NavLink>
          {user.role === "ADMIN" && <NavLink to="/admin/blocked-slots">Blocked Slots</NavLink>}
          {user.role === "ADMIN" && <NavLink to="/admin/manual-bookings">Manual Booking</NavLink>}
          {user.role === "ADMIN" && <NavLink to="/admin/venues">Venues</NavLink>}
          <Link to="/">Public Site</Link>
        </nav>
        <div className="admin-user">{user.name} · {user.role}<button type="button" onClick={handleLogout}>Sign Out</button></div>
      </header>
      <Outlet context={{ user }} />
    </div>
  );
}

export default AdminLayout;
