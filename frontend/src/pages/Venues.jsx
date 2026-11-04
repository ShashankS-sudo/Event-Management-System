import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { venueCapacity, venueDescription, venueImage } from "../utils/venuePresentation";
import SiteHeader from "../components/SiteHeader";
import "./Venues.css";

function Venues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/venues")
      .then((response) => { if (active) setVenues(response.data.venues || []); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Could not load venues."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  return (
    <><SiteHeader /><main className="venues-page">
      <section className="venues-banner"><span className="eyebrow">CAMPUS SPACES · SJBIT BENGALURU</span><h1>Find the right space for your next event.</h1><p>Browse the campus venues, review the details currently available, and check date-specific availability.</p><div className="venues-banner-tags"><span>Academic events</span><span>Student activities</span><span>Sports &amp; campus life</span></div><img src="https://www.sjbit.edu.in/img/home-about-bg.png" alt="SJB Institute of Technology campus" /></section>
      <header className="venues-heading">
        <div><span className="eyebrow">EXPLORE THE VENUE DIRECTORY</span><h2>Campus venues</h2><p>Capacity, facility and schedule details appear as SJBIT confirms them.</p></div>
        <Link to="/guidelines" className="venues-home-link">How booking works →</Link>
      </header>
      {loading && <p className="venues-state" aria-live="polite">Loading venues…</p>}
      {error && <div className="venues-state venues-error" role="alert"><p>{error}</p><button type="button" onClick={() => { setError(""); setLoading(true); setRetry((value) => value + 1); }}>Try again</button></div>}
      {!loading && !error && venues.length === 0 && <p className="venues-state">No active venues have been published yet.</p>}
      {!error && venues.length > 0 && <section className="venues-list" aria-label="Available venues">
        {venues.map((venue) => <article className="venue-list-card" key={venue._id}>
          <img src={venueImage(venue.slug)} alt={venue.name} />
          <div className="venue-list-content"><span className="venue-type">{venue.type}</span><h2>{venue.name}</h2><p>{venueDescription(venue)}</p><p className="venue-capacity-label">{venueCapacity(venue)}</p>
            <Link to={`/venues/${venue.slug}`} className="venue-details-button">View Details →</Link>
          </div>
        </article>)}
      </section>}
    </main></>
  );
}

export default Venues;
