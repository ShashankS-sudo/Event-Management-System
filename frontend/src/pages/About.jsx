import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import "./About.css";

const facts = [
  ["Established", "2001"],
  ["Campus", "13 acres in Kengeri, Bengaluru"],
  ["Academic status", "Autonomous under VTU from 2023–24"],
  ["Accreditation", "NAAC A+ and NBA accredited"],
];

function About() {
  return (
    <main className="about-page">
      <SiteHeader />
      <section className="about-hero">
        <div className="about-hero-copy"><span className="about-kicker">SJB INSTITUTE OF TECHNOLOGY · BENGALURU</span><h1>A campus where learning and community come together.</h1><p>SJBIT’s venue booking portal supports the academic, cultural and sports activities that bring the campus community together.</p><div className="about-hero-actions"><Link to="/venues" className="about-primary">Explore campus venues <span>→</span></Link><a href="https://www.sjbit.edu.in/about-sjbit.php" target="_blank" rel="noreferrer">Visit SJBIT website ↗</a></div></div>
        <div className="about-hero-image"><img src="https://www.sjbit.edu.in/img/home-about-bg.png" alt="SJB Institute of Technology campus" /></div>
      </section>
      <section className="about-facts" aria-label="SJBIT at a glance">{facts.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
      <section className="about-story">
        <div><span className="about-kicker">ABOUT THE INSTITUTE</span><h2>A distinguished legacy to continue building.</h2></div>
        <div><p>SJB Institute of Technology was established in 2001 by Sri Adichunchanagiri Shikshana Trust. The institute is located at BGS Health &amp; Education City in Kengeri, Bengaluru, and describes its focus as personal, social and intellectual growth through a comprehensive education.</p><p>The college website lists SJBIT as approved by AICTE, accredited by NAAC and NBA, recognized by UGC, and autonomous under Visvesvaraya Technological University (VTU), Belagavi from academic year 2023–24.</p><a href="https://www.sjbit.edu.in/about-sjbit.php" target="_blank" rel="noreferrer">Read the institute’s official profile ↗</a></div>
      </section>
      <section className="about-purpose">
        <article><span className="purpose-mark">01</span><span className="about-kicker">OUR VISION</span><h2>Global perspective</h2><p>To become a recognized technical education center with a global perspective.</p></article>
        <article><span className="purpose-mark">02</span><span className="about-kicker">OUR MISSION</span><h2>Learning with responsibility</h2><p>To provide learning opportunities that foster ethical values, development in science and technology, and social responsibility.</p></article>
        <article className="values-card"><span className="about-kicker">CORE VALUES</span><h2>Values that shape campus life</h2><div className="value-pills"><span>Humanity</span><span>Honesty</span><span>Integrity</span><span>Teamwork</span><span>Continuous learning</span><span>Innovation</span></div></article>
      </section>
      <section className="about-booking-callout"><div><span className="about-kicker">CAMPUS VENUE BOOKING</span><h2>Planning a campus event?</h2><p>Browse available spaces, review open slots and submit a request for approval.</p></div><Link to="/venues" className="about-primary">Start with venues <span>→</span></Link></section>
      <footer className="about-footer"><span>SJBIT Venue Booking System</span><span>Official institute information sourced from <a href="https://www.sjbit.edu.in/" target="_blank" rel="noreferrer">sjbit.edu.in</a>.</span></footer>
    </main>
  );
}

export default About;
