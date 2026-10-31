import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { venueCapacity, venueDescription, venueImage } from "../utils/venuePresentation";
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
    <main className="venues-page">
      <header className="venues-heading">
        <div><span className="eyebrow">SJBIT VENUE BOOKING SYSTEM</span><h1>Choose a Venue</h1><p>Select a venue to view its confirmed details and check availability.</p></div>
        <Link to="/" className="venues-home-link">← Back to Home</Link>
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
    </main>
  );
}

export default Venues;
