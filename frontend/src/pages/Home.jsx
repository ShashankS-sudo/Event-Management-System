import { Link } from "react-router-dom";
import "./Home.css";

const venues = [
  {
    id: 1,
    name: "SJBIT Auditorium",
    description: "For seminars, conferences and cultural events",
    capacity: "Capacity to be confirmed",
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    name: "Cricket Ground",
    description: "For cricket matches and outdoor activities",
    capacity: "Capacity to be confirmed",
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    name: "Basketball Court",
    description: "For basketball games and sports activities",
    capacity: "Outdoor sports venue",
    image:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 4,
    name: "CSE Seminar Hall",
    description: "For department seminars and meetings",
    capacity: "Capacity to be confirmed",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80",
  },
];

function Home() {
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
          <a href="#benefits">Guidelines</a>
          <a href="#about">About</a>
        </nav>

        <Link to="/login" className="header-login">
          Login
        </Link>
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
            <Link to="/login" className="primary-button">
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
            <Link to="/login" className="text-link">
              Book a venue →
            </Link>
          </div>

          <div className="venue-grid">
            {venues.map((venue) => (
              <article className="venue-card" key={venue.id}>
                <img src={venue.image} alt={venue.name} />

                <div className="venue-card-content">
                  <h3>{venue.name}</h3>
                  <p>{venue.description}</p>

                  <div className="venue-capacity">
                    <span>●</span> {venue.capacity}
                  </div>

                  <Link to="/login" className="venue-button">
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
