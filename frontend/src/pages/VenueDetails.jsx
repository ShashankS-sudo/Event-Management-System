
import { Link, useParams } from "react-router-dom";
import "./VenueDetails.css";

const venues = {
  auditorium: {
    name: "SJBIT Auditorium",
    type: "Indoor Auditorium",
    description:
      "A venue intended for college seminars, conferences, cultural programmes and other approved events.",
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=1400&q=85",
    facilities: ["Facilities to be confirmed"],
    capacity: "To be confirmed by SJBIT",
    location: "To be confirmed",
  },
  "cricket-ground": {
    name: "Cricket Ground",
    type: "Sports Ground",
    description:
      "An outdoor venue intended for cricket matches and other approved sports activities.",
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1400&q=85",
    facilities: ["Facilities to be confirmed"],
    capacity: "To be confirmed by SJBIT",
    location: "To be confirmed",
  },
  "basketball-court": {
    name: "Basketball Court",
    type: "Outdoor Sports Court",
    description:
      "An outdoor venue intended for basketball games, practice sessions and approved sports activities.",
    image:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1400&q=85",
    facilities: ["Facilities to be confirmed"],
    capacity: "To be confirmed by SJBIT",
    location: "To be confirmed",
  },
  "cse-seminar-hall": {
    name: "CSE Seminar Hall",
    type: "Seminar Hall",
    description:
      "A venue intended for CSE department seminars, presentations, meetings and other approved academic activities.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85",
    facilities: ["Facilities to be confirmed"],
    capacity: "To be confirmed by SJBIT",
    location: "To be confirmed",
  },
};

function VenueDetails() {
  const { id } = useParams();
  const venue = venues[id];

  if (!venue) {
    return (
      <main className="venue-details-page">
        <h1>Venue not found</h1>
        <Link to="/venues">Back to Venues</Link>
      </main>
    );
  }

  return (
    <main className="venue-details-page">
      <Link to="/venues" className="back-link">
        ← Back to Venues
      </Link>

      <div className="venue-details-card">
        <img
          className="venue-details-image"
          src={venue.image}
          alt={venue.name}
        />

        <div className="venue-details-content">
          <span className="venue-details-type">{venue.type}</span>
          <h1>{venue.name}</h1>
          <p className="venue-overview">{venue.description}</p>

          <div className="venue-info-grid">
            <section className="venue-info-item">
              <h3>Capacity</h3>
              <p>{venue.capacity}</p>
            </section>

            <section className="venue-info-item">
              <h3>Location</h3>
              <p>{venue.location}</p>
            </section>

            <section className="venue-info-item">
              <h3>Facilities</h3>
              <ul>
                {venue.facilities.map((facility) => (
                  <li key={facility}>{facility}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="venue-guidelines">
            <h2>Before You Book</h2>
            <p>
              Check the venue's availability and follow the college's
              approved booking rules. A booking request is not confirmed
              until the required approval has been granted.
            </p>
          </div>

          <div className="venue-details-actions">
            <Link to="/venues" className="secondary-button">
              Back to Venues
            </Link>

            <Link
              to={`/venues/${id}/availability`}
              className="details-primary-button"
            >
              Check Availability &amp; Book →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default VenueDetails;
