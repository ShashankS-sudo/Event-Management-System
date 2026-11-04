import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import "./Contact.css";

function Contact() {
  return <><SiteHeader /><main className="contact-page">
    <section className="contact-hero"><div><span className="contact-eyebrow">SJB INSTITUTE OF TECHNOLOGY · BENGALURU</span><h1>We’re here to help you plan your campus event.</h1><p>For venue permissions, facilities, access and college policies, contact SJBIT directly. For a request already submitted, sign in to review it under My Bookings.</p><div className="contact-actions"><a className="contact-primary" href="tel:+918028612445">Call the institute <span>→</span></a><Link to="/bookings">View my bookings</Link></div></div><img src="https://www.sjbit.edu.in/img/home-about-bg.png" alt="SJB Institute of Technology campus" /></section>
    <section className="contact-grid" aria-label="SJBIT contact information">
      <article className="contact-card contact-main-card"><span className="contact-icon">⌖</span><span className="contact-label">VISIT THE CAMPUS</span><h2>SJB Institute of Technology</h2><p>No. 67, BGS Health &amp; Education City,<br />Dr. Vishnuvardhan Road, Kengeri,<br />Bengaluru, Karnataka 560060</p><a href="https://www.google.com/maps/search/?api=1&query=SJB+Institute+of+Technology+Bengaluru" target="_blank" rel="noreferrer">Open directions ↗</a></article>
      <article className="contact-card"><span className="contact-icon">☎</span><span className="contact-label">CALL THE INSTITUTE</span><h2>Reception</h2><p>For general institute enquiries, contact the main number.</p><a href="tel:+918028612445">+91-80-2861 2445</a><a href="tel:+918028612446">+91-80-2861 2446</a></article>
      <article className="contact-card"><span className="contact-icon">✉</span><span className="contact-label">EMAIL</span><h2>Principal’s Office</h2><p>Use the published institute contact email for general enquiries.</p><a href="mailto:principal@sjbit.edu.in">principal@sjbit.edu.in</a></article>
    </section>
    <section className="contact-help"><div><span className="contact-eyebrow">VENUE BOOKING SUPPORT</span><h2>What do you need help with?</h2><p>Use the right channel to get your event question to the responsible team.</p></div><div className="contact-help-cards"><article><strong>New booking request</strong><p>Browse venues, check the slot and submit a request in the portal.</p><Link to="/venues">Browse venues →</Link></article><article><strong>Booking status or notification</strong><p>Sign in to review your booking reference, decision and updates.</p><Link to="/login">Sign in →</Link></article><article><strong>College permissions or setup</strong><p>Contact the responsible department or institute office to confirm arrangements and rules.</p><a href="https://www.sjbit.edu.in/contact-us.php" target="_blank" rel="noreferrer">Official contact directory ↗</a></article></div></section>
    <aside className="contact-source">Contact details shown here are taken from the <a href="https://www.sjbit.edu.in/contact-us.php" target="_blank" rel="noreferrer">official SJBIT Contact page</a>. For the latest details, refer to the college website.</aside>
  </main></>;
}

export default Contact;
