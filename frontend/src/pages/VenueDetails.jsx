import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { venueDescription, venueImage } from "../utils/venuePresentation";
import "./VenueDetails.css";

function VenueDetails() {
  const { id: slug } = useParams();
  const [venue, setVenue] = useState(null);
  const [loadedSlug, setLoadedSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/venues/${slug}`)
      .then((response) => { if (active) { setVenue(response.data.venue); setError(""); setLoadedSlug(slug); setLoading(false); } })
      .catch((requestError) => { if (active) { setVenue(null); setError(requestError.response?.data?.message || "Could not load venue details."); setLoadedSlug(slug); setLoading(false); } });
    return () => { active = false; };
  }, [slug]);

  return (
    <main className="venue-details-page">
      <Link to="/venues" className="back-link">← Back to Venues</Link>
      {(loading || loadedSlug !== slug) && <p className="venue-details-state" aria-live="polite">Loading venue details…</p>}
      {loadedSlug === slug && error && <section className="venue-details-state" role="alert"><h1>Venue unavailable</h1><p>{error}</p><Link to="/venues">Browse venues</Link></section>}
      {venue && loadedSlug === slug && !loading && !error && <div className="venue-details-card">
        <img className="venue-details-image" src={venueImage(venue.slug)} alt={venue.name} />
        <div className="venue-details-content">
          <span className="venue-details-type">{venue.type}</span><h1>{venue.name}</h1><p className="venue-overview">{venueDescription(venue)}</p>
          <div className="venue-info-grid">
            <section className="venue-info-item"><h3>Capacity</h3><p>{venue.capacity || "To be confirmed by SJBIT"}</p></section>
            <section className="venue-info-item"><h3>Location</h3><p>{venue.location || "To be confirmed by SJBIT"}</p></section>
            <section className="venue-info-item"><h3>Facilities</h3>{venue.facilities?.length ? <ul>{venue.facilities.map((facility) => <li key={facility}>{facility}</li>)}</ul> : <p>To be confirmed by SJBIT</p>}</section>
            <section className="venue-info-item venue-slots-item"><h3>Configured time slots</h3>{venue.timeSlots?.length ? <ul>{venue.timeSlots.map((slot) => <li key={slot.key}>{slot.label}</li>)}</ul> : <p>Schedule has not been configured yet.</p>}</section>
          </div>
          <div className="venue-guidelines"><h2>Before You Book</h2><p>Check live availability and submit a request with complete event details. A request remains pending until an authorized approver decides it. Read the <Link to="/guidelines">booking guidelines</Link> before submitting.</p></div>
          <div className="venue-details-actions"><Link to="/venues" className="secondary-button">Back to Venues</Link><Link to={`/venues/${venue.slug}/availability`} className="details-primary-button">Check Availability &amp; Book →</Link></div>
        </div>
      </div>}
    </main>
  );
}

export default VenueDetails;
