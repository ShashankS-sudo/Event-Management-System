const authRoutes = require("./routes/authRoutes");
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

module.exports = app;
