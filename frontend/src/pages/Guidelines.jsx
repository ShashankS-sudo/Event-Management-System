import { Link } from "react-router-dom";
import "./Guidelines.css";

const guidelines = [
  { title: "Choose a venue and date", body: "Review the venue details and check its live date and time slot availability before starting a request." },
  { title: "Submit complete event information", body: "Provide an event title, organizing department or organization, date, configured slot, expected attendance, and a clear description. Select only facilities listed for the venue." },
  { title: "Wait for the approval decision", body: "Submitting a request does not reserve the venue. The request remains pending until an authorized approver approves or rejects it. You can follow its status under My Bookings." },
  { title: "Cancellation and changes", body: "Eligible customers can cancel before the configured cancellation cutoff. The current system default is four days before the event; administrators can configure this value. After the cutoff, submit a reasoned exception request for approver review. Rejected requests can be edited and resubmitted as a new request." },
  { title: "Use the venue responsibly", body: "Follow any venue-specific instructions provided by SJBIT staff, leave the space in suitable condition, and make arrangements for requested facilities with the responsible department." },
];

function Guidelines() {
  return (
    <main className="guidelines-page">
      <header className="guidelines-header"><Link to="/" className="guidelines-back">← Home</Link><span className="guidelines-eyebrow">SJBIT VENUE BOOKING SYSTEM</span><h1>Booking Guidelines</h1><p>A quick guide to requesting and managing campus venue bookings.</p></header>
      <section className="guidelines-list" aria-label="Booking rules">
        {guidelines.map((item, index) => <article className="guideline-card" key={item.title}><span className="guideline-number">{String(index + 1).padStart(2, "0")}</span><div><h2>{item.title}</h2><p>{item.body}</p></div></article>)}
      </section>
      <aside className="guidelines-note"><strong>Institutional policy notice</strong><p>These instructions describe the current application workflow. SJBIT’s official venue policies, approval authorities, capacities, facility arrangements, and any additional restrictions should be confirmed with the responsible college office.</p></aside>
      <div className="guidelines-actions"><Link to="/venues" className="guidelines-primary">Browse Venues →</Link><Link to="/bookings" className="guidelines-secondary">My Bookings</Link></div>
    </main>
  );
}

export default Guidelines;
