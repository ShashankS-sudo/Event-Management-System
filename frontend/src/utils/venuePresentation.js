const venueImages = {
  auditorium: "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80",
  "cricket-ground": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80",
  "basketball-court": "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=80",
  "cse-seminar-hall": "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
};

export function venueImage(slug) {
  return venueImages[slug] || "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80";
}

export function venueDescription(venue) {
  return venue.description?.trim() || "Venue details will be published after they are confirmed.";
}

export function venueCapacity(venue) {
  return venue.capacity ? `Capacity: ${venue.capacity}` : "Capacity to be confirmed";
}
