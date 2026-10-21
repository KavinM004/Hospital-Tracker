import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdmissionForm from "./pages/AdmissionForm";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

/* Always show patient login when opening the root URL */
function Home() {
  return <Navigate to="/login" replace />;
}

/* Allow only authenticated patients to access patient pages */
function PatientOnly({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

/* Patient login remains visible even when a session exists */
function PatientLoginRoute() {
  return <Login />;
}

/* Redirect users who are already logged in away from signup */
function PatientSignupRoute() {
  const { user } = useAuth();

  if (user) {
    return (
      <Navigate to={user.role === "ADMIN" ? "/admin" : "/dashboard"} replace />
    );
  }

  return <Signup />;
}

/* Keep admin login separate from patient login */
function AdminLoginRoute() {
  const { user } = useAuth();

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminLogin />;
}

/* Handle unknown URLs */
function NotFound() {
  const { user } = useAuth();

  const destination = user
    ? user.role === "ADMIN"
      ? "/admin"
      : "/dashboard"
    : "/login";

  return (
    <main className="home-page">
      <nav className="home-nav">
        <Link to="/" className="brand-link">
          MediCare Hospital
        </Link>

        <Link className="btn secondary" to="/login">
          Patient login
        </Link>
      </nav>

      <section className="home-hero">
        <p className="eyebrow">PAGE NOT FOUND</p>

        <h1>
          This page
          <br />
          <span>doesn't exist.</span>
        </h1>

        <p>
          The page you requested may have moved or the URL may be incorrect.
        </p>

        <div className="home-actions">
          <Link className="btn primary" to={destination}>
            Return to your page
          </Link>

          {!user && (
            <Link className="btn secondary" to="/admin/login">
              Administrator login
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Website default: patient login */}
        <Route path="/" element={<Home />} />

        {/* Patient authentication */}
        <Route path="/login" element={<PatientLoginRoute />} />

        <Route path="/signup" element={<PatientSignupRoute />} />

        {/* Forgot and reset password */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Separate administrator authentication */}
        <Route path="/admin/login" element={<AdminLoginRoute />} />

        {/* Protected administrator dashboard */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Protected patient dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Patient appointment registration */}
        <Route
          path="/admission"
          element={
            <PatientOnly>
              <AdmissionForm />
            </PatientOnly>
          }
        />

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
