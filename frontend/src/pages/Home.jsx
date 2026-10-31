import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { venueCapacity, venueDescription, venueImage } from "../utils/venuePresentation";
import useAuth from "../context/useAuth";
import "./Home.css";

function Home() {
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError] = useState("");
  const { user, logout } = useAuth();

  async function handleLogout() {
    try { await logout(); } catch { setVenuesError("Could not sign out. Please try again."); }
  }

  useEffect(() => {
    let active = true;
    api.get("/venues")
      .then((response) => { if (active) setVenues(response.data.venues || []); })
      .catch((error) => { if (active) setVenuesError(error.response?.data?.message || "Venue information is temporarily unavailable."); })
      .finally(() => { if (active) setVenuesLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="home-page">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-emblem">S</span>
          <span>
            <strong>SJBIT</strong>
            <small>Venue Booking System</small>
          </span>
        </Link>

        <nav className="main-nav">
          <Link to="/">Home</Link>
          <Link to="/venues">Venues</Link>
          <Link to="/bookings">My Bookings</Link>
          <Link to="/notifications">Notifications</Link>
          <Link to="/guidelines">Guidelines</Link>
          <a href="#about">About</a>
        </nav>

        {user ? <button type="button" className="header-login" onClick={handleLogout}>Sign Out</button> : <Link to="/login" className="header-login">Login</Link>}
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">SJBIT VENUE BOOKING SYSTEM</span>
            <h1>
              Book Your
              <br />
              <span>Campus Venue</span>
            </h1>
            <p>
              Find and request campus venues for academic, cultural,
              sports and departmental events — all in one place.
            </p>
            <Link to="/venues" className="primary-button">
              Book a Venue <span>→</span>
            </Link>
          </div>

          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1400&q=85"
              alt="Temporary university campus photograph"
            />
          </div>
        </section>

        <section className="venues-section" id="venues">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPLORE OUR FACILITIES</span>
              <h2>Find Your Perfect Venue</h2>
              <p>Explore campus spaces for your next event.</p>
            </div>
            <Link to="/venues" className="text-link">
              Book a venue →
            </Link>
          </div>

          {venuesLoading && <p className="venue-load-state">Loading venues…</p>}
          {venuesError && <p className="venue-load-state" role="alert">{venuesError} <Link to="/venues">Retry on the venues page</Link></p>}
          {!venuesLoading && !venuesError && venues.length === 0 && <p className="venue-load-state">No venues are currently published.</p>}
          <div className="venue-grid">
            {venues.map((venue) => (
              <article className="venue-card" key={venue._id}>
                <img src={venueImage(venue.slug)} alt={venue.name} />

                <div className="venue-card-content">
                  <h3>{venue.name}</h3>
                  <p>{venueDescription(venue)}</p>

                  <div className="venue-capacity">
                    <span>●</span> {venueCapacity(venue)}
                  </div>

                  <Link to={`/venues/${venue.slug}`} className="venue-button">
                    View Details →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="benefits-section" id="benefits">
          <div className="benefit">
            <span className="benefit-icon">✓</span>
            <div>
              <h3>Easy Booking</h3>
              <p>Simple steps to request a venue.</p>
            </div>
          </div>

          <div className="benefit">
            <span className="benefit-icon">◷</span>
            <div>
              <h3>Check Availability</h3>
              <p>Review available dates and slots.</p>
            </div>
          </div>

          <div className="benefit">
            <span className="benefit-icon">◎</span>
            <div>
              <h3>Approval Tracking</h3>
              <p>Keep track of your booking status.</p>
            </div>
          </div>

          <div className="benefit">
            <span className="benefit-icon">♧</span>
            <div>
              <h3>For Campus Events</h3>
              <p>One place for campus venue requests.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer" id="about">
        <strong>SJBIT Venue Booking System</strong>
        <p>A campus venue booking and management project.</p>
      </footer>
    </div>
  );
}

export default Home;
