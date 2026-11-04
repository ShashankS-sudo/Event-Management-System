import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { venueCapacity, venueDescription, venueImage } from "../utils/venuePresentation";
import SiteHeader from "../components/SiteHeader";
import "./Home.css";

function Home() {
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError] = useState("");

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
      <SiteHeader />

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
              src="https://www.sjbit.edu.in/img/home-about-bg.png"
              alt="SJB Institute of Technology campus"
            />
          </div>
        </section>

        <section className="campus-facts" aria-label="About SJBIT">
          <div><strong>2001</strong><span>Established</span></div>
          <div><strong>13 acres</strong><span>Campus area</span></div>
          <div><strong>NAAC A+</strong><span>Accreditation</span></div>
          <div><strong>VTU</strong><span>Autonomous institution</span></div>
          <Link to="/about">Discover SJBIT <span>→</span></Link>
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
        <section className="home-about">
          <div className="home-about-image"><img src="https://www.sjbit.edu.in/img/home-about-bg.png" alt="SJBIT campus architecture" loading="lazy" /></div>
          <div className="home-about-copy"><span className="eyebrow">A CAMPUS FOR LEARNING AND COMMUNITY</span><h2>Make space for ideas, sport and celebration.</h2><p>SJBIT brings together academic learning, innovation and student life. This booking portal helps departments and campus organizers request spaces for their events and follow each request through review.</p><div className="home-about-values"><span>Humanity</span><span>Integrity</span><span>Teamwork</span><span>Innovation</span></div><Link to="/about" className="text-link">About SJBIT →</Link></div>
        </section>
      </main>

      <footer className="site-footer" id="about">
        <div><strong>SJBIT Venue Booking System</strong><p>Space for campus learning, sport and community.</p></div>
        <div><strong>SJB Institute of Technology</strong><p>BGS Health &amp; Education City, Dr. Vishnuvardhan Road,<br />Kengeri, Bengaluru – 560060, Karnataka, India</p></div>
        <div className="footer-links"><Link to="/guidelines">Booking Guidelines</Link><Link to="/about">About SJBIT</Link><Link to="/contact">Contact</Link><a href="https://www.sjbit.edu.in/" target="_blank" rel="noreferrer">Official college website ↗</a></div>
      </footer>
    </div>
  );
}

export default Home;
