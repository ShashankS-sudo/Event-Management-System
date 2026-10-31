
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import "./Availability.css";

const venueNames = {
  auditorium: "SJBIT Auditorium",
  "cricket-ground": "Cricket Ground",
  "basketball-court": "Basketball Court",
  "cse-seminar-hall": "CSE Seminar Hall",
};

const timeSlots = [
  "09:00 AM - 11:00 AM",
  "11:00 AM - 01:00 PM",
  "01:00 PM - 03:00 PM",
  "03:00 PM - 05:00 PM",
];

function Availability() {
  const { id } = useParams();
  const venueName = venueNames[id];
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  if (!venueName) {
    return (
      <main className="availability-page">
        <h1>Venue not found</h1>
        <Link to="/venues">Back to Venues</Link>
      </main>
    );
  }

  const today = new Date().toLocaleDateString("en-CA");

  return (
    <main className="availability-page">
      <Link to={`/venues/${id}`} className="availability-back">
        ← Back to Venue Details
      </Link>

      <section className="availability-card">
        <span className="availability-eyebrow">BOOKING STEP 1</span>
        <h1>Check Availability</h1>
        <p className="availability-description">
          Select a date and time slot for your event.
        </p>

        <div className="selected-venue">
          <span>Selected Venue</span>
          <h2>{venueName}</h2>
        </div>

        <label htmlFor="booking-date">Choose a Date</label>
        <input
          id="booking-date"
          type="date"
          min={today}
          value={selectedDate}
          onChange={(event) => {
            setSelectedDate(event.target.value);
            setSelectedSlot("");
          }}
          required
        />

        <h2 className="slots-heading">Time Slots</h2>
        <p className="slots-note">
          Slot status will be shown after live availability is connected.
        </p>

        <div className="time-slot-list">
          {timeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`time-slot ${
                selectedSlot === slot ? "selected" : ""
              }`}
              disabled={!selectedDate}
              onClick={() => setSelectedSlot(slot)}
            >
              <span>{slot}</span>
              <span className="slot-status">
                {selectedSlot === slot ? "Selected" : "Select"}
              </span>
            </button>
          ))}
        </div>

        <p className="availability-disclaimer">
          These are sample time slots for the interface only. They are not
          verified as available. The actual availability check will be
          connected to booking records before booking requests are enabled.
        </p>

        <div className="availability-actions">
          <Link to={`/venues/${id}`} className="availability-secondary">
            Back
          </Link>

          <button
            type="button"
            className="availability-primary"
            disabled={!selectedDate || !selectedSlot}
            onClick={() =>
              alert(
                "The booking form will be connected after live availability is implemented."
              )
            }
          >
            Continue →
          </button>
        </div>
      </section>
    </main>
  );
}

export default Availability;
