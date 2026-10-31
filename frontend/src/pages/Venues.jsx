
import { Link } from "react-router-dom";
import "./Venues.css";

const venues = [
  {
    id: "auditorium",
    name: "SJBIT Auditorium",
    type: "Indoor Auditorium",
    description: "For seminars, conferences and cultural events.",
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "cricket-ground",
    name: "Cricket Ground",
    type: "Sports Ground",
    description: "For cricket matches and outdoor activities.",
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "basketball-court",
    name: "Basketball Court",
    type: "Outdoor Court",
    description: "For basketball games and sports activities.",
    image:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "cse-seminar-hall",
    name: "CSE Seminar Hall",
    type: "Seminar Hall",
    description: "For CSE department seminars and meetings.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80",
  },
];

function Venues() {
  return (
    <main className="venues-page">
      <header className="venues-heading">
        <div>
          <span className="eyebrow">SJBIT VENUE BOOKING SYSTEM</span>
          <h1>Choose a Venue</h1>
          <p>Select a venue to view its details and check availability.</p>
        </div>

        <Link to="/" className="venues-home-link">
          ← Back to Home
        </Link>
      </header>

      <section className="venues-list">
        {venues.map((venue) => (
          <article className="venue-list-card" key={venue.id}>
            <img src={venue.image} alt={venue.name} />

            <div className="venue-list-content">
              <span className="venue-type">{venue.type}</span>
              <h2>{venue.name}</h2>
              <p>{venue.description}</p>

              <Link
                to={`/venues/${venue.id}`}
                className="venue-details-button"
              >
                View Details →
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Venues;
