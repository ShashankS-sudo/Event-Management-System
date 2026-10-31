
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Venues from "./pages/Venues";
import VenueDetails from "./pages/VenueDetails";
import Availability from "./pages/Availability";
import BookingForm from "./pages/BookingForm";
import MyBookings from "./pages/MyBookings";
import BookingDetails from "./pages/BookingDetails";
import AdminLayout from "./pages/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBookings from "./pages/AdminBookings";
import AdminBlockedSlots from "./pages/AdminBlockedSlots";
import AdminManualBookings from "./pages/AdminManualBookings";
import Notifications from "./pages/Notifications";
import Guidelines from "./pages/Guidelines";
import AdminVenues from "./pages/AdminVenues";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/venues/:id/availability"
          element={<Availability />}
        />
        <Route path="/venues/:id/book" element={<BookingForm />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/bookings/:id" element={<BookingDetails />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/guidelines" element={<Guidelines />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="blocked-slots" element={<AdminBlockedSlots />} />
          <Route path="manual-bookings" element={<AdminManualBookings />} />
          <Route path="venues" element={<AdminVenues />} />
        </Route>
        <Route path="/venues/:id" element={<VenueDetails />} />
        <Route path="/venues" element={<Venues />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
