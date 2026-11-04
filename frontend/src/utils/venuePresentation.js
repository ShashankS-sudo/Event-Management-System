const venueImages = {
  auditorium: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80",
  "cricket-ground": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80",
  "basketball-court": "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",
  "basketball-ground": "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",
  "cse-seminar-hall": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
};

export function venueImage(slug) {
  return venueImages[slug] || "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80";
}

export function venueDescription(venue) {
  if (venue.description?.trim()) return venue.description.trim();
  const descriptions = {
    auditorium: "A campus gathering space for academic, cultural and community events. Confirm seating, equipment and event arrangements with the responsible college office.",
    "basketball-ground": "An outdoor campus sports space for basketball and student activities. Confirm access, equipment and availability before planning your event.",
    "cricket-ground": "A campus ground for cricket and sports activities. Confirm event arrangements, access and available facilities with the college office.",
    "cse-seminar-hall": "A departmental space for seminars, talks and academic meetings. Confirm seating, equipment and access for your event with the responsible department.",
  };
  return descriptions[venue.slug] || "Explore this campus space and check its live availability. Details are published here as the college confirms them.";
}

export function venueCapacity(venue) {
  return venue.capacity ? `Capacity: ${venue.capacity}` : "Capacity to be confirmed";
}
