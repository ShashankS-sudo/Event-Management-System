
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
        <Route path="/venues/:id" element={<VenueDetails />} />
        <Route path="/venues" element={<Venues />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
