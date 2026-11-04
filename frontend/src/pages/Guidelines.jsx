import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import "./Guidelines.css";

const guidelines = [
  { title: "Sign in with your account", body: "Use your registered student or staff account to create requests. Sign in before booking so you can see your requests, review notifications and respond to booking decisions." },
  { title: "Choose a suitable venue and slot", body: "Browse the four listed spaces, read the details currently published for each venue, then check the calendar and choose a continuous range of one or more hourly periods. Submit the request at least two days before the event. Availability can change while requests are being reviewed." },
  { title: "Prepare your event details", body: "Have the event title, organizing department, date, requested time, expected attendance and a useful event description ready. Select only facilities offered in the form and add any other requirements clearly." },
  { title: "Review before submitting", body: "Check the venue, date, slot and attendance on the review screen. A submitted request is sent for approval; it is not a confirmed reservation. Avoid making event arrangements that depend on the space until the request is approved." },
  { title: "Track the decision", body: "Use My Bookings to find your reference number and current status. Pending requests are under review; approved requests have been accepted in the system; rejected requests include a decision and can be corrected and submitted again." },
  { title: "Cancel or request a change", body: "The regular customer cancellation option closes four days before the event. After that cutoff, submit a reasoned late-cancellation request for management review. New cancellation and booking requests are emailed to the management inbox. Contact the responsible college office if your event details need an update that the application does not support." },
  { title: "Follow venue instructions", body: "Check any instructions shown for the specific venue and follow directions from the responsible SJBIT staff. Confirm setup, equipment, access and cleanup arrangements with the college office; this application does not replace those arrangements." },
];

function Guidelines() {
  return (
    <><SiteHeader /><main className="guidelines-page">
      <header className="guidelines-header"><Link to="/" className="guidelines-back">← Home</Link><span className="guidelines-eyebrow">SJBIT VENUE BOOKING SYSTEM</span><h1>Plan your event. Request your space.</h1><p>A clear guide to finding a venue, submitting a request and following its status.</p></header>
      <section className="guidelines-intro"><div><span className="guidelines-eyebrow">BEFORE YOU BEGIN</span><h2>A little preparation makes booking easier.</h2><p>Check the date and slot first, then gather the event details and facilities you need. You can return to your booking details and notifications at any time after submitting.</p></div><div className="guidelines-checklist"><strong>Have these ready</strong><span>Event name and department</span><span>Preferred date and time</span><span>Expected attendance</span><span>Facility and setup needs</span></div></section>
      <section className="guidelines-list" aria-label="Booking rules">
        {guidelines.map((item, index) => <article className="guideline-card" key={item.title}><span className="guideline-number">{String(index + 1).padStart(2, "0")}</span><div><h2>{item.title}</h2><p>{item.body}</p></div></article>)}
      </section>
      <aside className="guidelines-note"><strong>College rules and venue arrangements</strong><p>This page explains how the application works. It is not a substitute for SJBIT’s official venue policies. Confirm event permissions, access, setup, safety requirements and any temporary restrictions with the responsible college office. The listed locations are on the SJBIT campus; no additional facilities are included with these venue spaces.</p><a href="https://www.sjbit.edu.in/" target="_blank" rel="noreferrer">Visit the official SJBIT website ↗</a></aside>
      <div className="guidelines-actions"><Link to="/venues" className="guidelines-primary">Browse Venues →</Link><Link to="/bookings" className="guidelines-secondary">My Bookings</Link></div>
    </main></>
  );
}

export default Guidelines;
