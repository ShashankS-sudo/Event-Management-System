const authRoutes = require("./routes/authRoutes");
const venueRoutes = require("./routes/venueRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const app = express();

// Add security-related HTTP headers
app.use(cookieParser());
app.use(helmet());

// Allow our React frontend to communicate with the backend
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/venues", venueRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

// Test endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "College Venue Booking API is running",
  });
});

// Handle unknown API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Keep unexpected errors in the standard API response shape.
app.use((error, req, res, next) => {
  console.error("API error:", error.message);
  res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : "An unexpected server error occurred",
  });
});

module.exports = app;
