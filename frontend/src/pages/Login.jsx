
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Login.css";

function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await api.post("/auth/login", {
        email,
        password,
      });
      const destination = location.state?.from;
      navigate(destination ? `${destination.pathname}${destination.search || ""}` : "/venues", { replace: true });
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="college-logo">SJBIT</div>

        <h1>Welcome Back</h1>
        <p>Login to continue to Venue Booking System</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">USN / Email</label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your USN or email"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="show-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="forgot-password">
            <button
              type="button"
              onClick={() =>
                setMessage("Please contact your administrator to reset your password.")
              }
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && (
          <p className="login-message" role="status">
            {message}
          </p>
        )}

        <p className="signup-link">
          Don't have an account?{" "}
          <Link to="/register">Sign Up</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
