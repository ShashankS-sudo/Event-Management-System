import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import "./SiteHeader.css";

function SiteHeader() {
  const { user, logout } = useAuth();
  const [error, setError] = useState("");
  const department = (user?.department || "").trim().toUpperCase();
  const canOpenAdmin = ["ADMIN", "PRINCIPAL"].includes(user?.role)
    || (user?.role === "HOD" && ["CSE", "COMPUTER SCIENCE AND ENGINEERING", "COMPUTER SCIENCE & ENGINEERING"].includes(department));
  async function handleLogout() {
    try { await logout(); setError(""); } catch { setError("Could not sign out. Please try again."); }
  }
  return <>
    <header className="public-site-header">
      <Link to="/" className="public-brand"><span className="public-brand-seal">S</span><span><strong>SJB INSTITUTE OF TECHNOLOGY</strong><small>Campus Venue Booking</small></span></Link>
      <nav aria-label="Main navigation"><Link to="/">Home</Link><Link to="/venues">Venues</Link><Link to="/bookings">My Bookings</Link><Link to="/notifications">Notifications</Link><Link to="/guidelines">Guidelines</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link></nav>
      <div className="public-header-actions">
        {canOpenAdmin && <Link to="/admin/dashboard" className="public-header-admin">Admin Dashboard</Link>}
        {user ? <button type="button" className="public-header-action" onClick={handleLogout}>Sign out</button> : <Link to="/login" className="public-header-action">Login</Link>}
      </div>
    </header>
    {error && <p className="public-header-error" role="alert">{error}</p>}
  </>;
}

export default SiteHeader;
