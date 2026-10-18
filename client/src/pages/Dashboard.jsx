import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  LogOut,
  Plus,
  RefreshCw,
  Stethoscope,
  Ticket,
  Wallet,
} from "lucide-react";

import api from "../api";
import { useAuth } from "../context/AuthContext";

function formatDate(value) {
  if (!value) return "Date not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date not set";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getStatusClass(status) {
  const value = String(status || "PENDING").toLowerCase();

  if (value === "paid") return "paid";
  if (value === "failed") return "failed";

  return "pending";
}

function getTokenNumber(value) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  return String(value).padStart(3, "0");
}

function SummaryCard({ icon: Icon, label, value, description, color }) {
  return (
    <article className="patient-stat-card">
      <div className={`patient-stat-icon ${color}`}>
        <Icon size={22} />
      </div>

      <div className="patient-stat-content">
        <p>{label}</p>
        <h2>{value}</h2>
        <span>{description}</span>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const loadAdmissions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admissions/mine");

      const records = Array.isArray(data?.admissions)
        ? data.admissions
        : Array.isArray(data)
          ? data
          : [];

      setAdmissions(records);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "We couldn't load your appointments. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmissions();
  }, [loadAdmissions]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = admissions.filter((item) => {
      if (!item.appointmentDate) return false;

      const date = new Date(item.appointmentDate);
      return !Number.isNaN(date.getTime()) && date >= today;
    });

    const pending = admissions.filter(
      (item) => String(item.paymentStatus).toUpperCase() === "PENDING",
    );

    const paid = admissions.filter(
      (item) => String(item.paymentStatus).toUpperCase() === "PAID",
    );

    return {
      total: admissions.length,
      upcoming: upcoming.length,
      pending: pending.length,
      paid: paid.length,
    };
  }, [admissions]);

  async function downloadToken(admissionId) {
    setError("");
    setDownloadingId(admissionId);

    let objectUrl;

    try {
      const response = await api.get(`/admissions/${admissionId}/token.pdf`, {
        responseType: "blob",
      });

      objectUrl = URL.createObjectURL(response.data);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `medicare-token-${admissionId}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to download the token. Please try again.",
      );
    } finally {
      if (objectUrl) {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }

      setDownloadingId("");
    }
  }

  function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      logout();
      navigate("/login", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="patient-dashboard">
      <section className="patient-welcome">
        <div className="patient-welcome-copy">
          <span className="patient-kicker">
            <span className="patient-kicker-dot" />
            PATIENT PORTAL
          </span>

          <h1>
            Welcome back,{" "}
            <span>{user?.name?.trim()?.split(/\s+/)[0] || "there"}</span>
          </h1>

          <p>
            Keep track of your appointments, consultation fees and patient
            tokens in one place.
          </p>

          <div className="patient-welcome-actions">
            <Link className="patient-primary-button" to="/admission">
              <Plus size={18} />
              Book an appointment
            </Link>

            <button
              type="button"
              className="patient-signout-button"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOut size={17} />
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>

        <div className="patient-welcome-art" aria-hidden="true">
          <div className="patient-art-circle patient-art-circle-one" />
          <div className="patient-art-circle patient-art-circle-two" />

          <div className="patient-art-card">
            <div className="patient-art-icon">
              <Stethoscope size={31} />
            </div>
            <span>YOUR HEALTH MATTERS</span>
            <strong>Care, made simpler.</strong>
            <div className="patient-art-line" />
            <div className="patient-art-line short" />
          </div>

          <div className="patient-art-badge">
            <CheckCircle2 size={19} />
            Your care, organized
          </div>
        </div>
      </section>

      {error && (
        <div className="patient-alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadAdmissions}>
            Try again
          </button>
        </div>
      )}

      <section className="patient-stats-grid">
        <SummaryCard
          icon={Ticket}
          label="Total appointments"
          value={loading ? "—" : stats.total}
          description="All your registrations"
          color="blue"
        />

        <SummaryCard
          icon={CalendarDays}
          label="Upcoming visits"
          value={loading ? "—" : stats.upcoming}
          description="Today and future appointments"
          color="mint"
        />

        <SummaryCard
          icon={Clock3}
          label="Pending payments"
          value={loading ? "—" : stats.pending}
          description="Awaiting payment confirmation"
          color="amber"
        />

        <SummaryCard
          icon={Wallet}
          label="Paid appointments"
          value={loading ? "—" : stats.paid}
          description="Payment confirmed"
          color="violet"
        />
      </section>

      <section className="patient-appointments">
        <div className="patient-section-heading">
          <div>
            <span className="patient-section-kicker">YOUR HEALTH RECORD</span>
            <h2>Your appointments</h2>
            <p>View your doctor, appointment date, token and payment status.</p>
          </div>

          <button
            type="button"
            className="patient-refresh-button"
            onClick={loadAdmissions}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "patient-spinning" : ""}
            />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="patient-loading">
            <div className="patient-loader" />
            <h3>Loading your appointments</h3>
            <p>Please wait while we retrieve your patient records.</p>
          </div>
        ) : admissions.length === 0 ? (
          <div className="patient-empty-state">
            <div className="patient-empty-icon">
              <CalendarDays size={30} />
            </div>

            <h3>No appointments yet</h3>

            <p>
              Your appointments will appear here after you complete a
              registration.
            </p>

            <Link className="patient-primary-button" to="/admission">
              <Plus size={18} />
              Register for your first visit
            </Link>
          </div>
        ) : (
          <div className="patient-appointment-list">
            {admissions.map((admission) => {
              const status = String(
                admission.paymentStatus || "PENDING",
              ).toUpperCase();

              return (
                <article
                  className="patient-appointment-card"
                  key={admission._id}
                >
                  <div className="patient-doctor-avatar">
                    <Stethoscope size={24} />
                  </div>

                  <div className="patient-appointment-info">
                    <div className="patient-appointment-title">
                      <h3>{admission.doctor?.name || "Doctor"}</h3>

                      <span
                        className={`patient-status ${getStatusClass(status)}`}
                      >
                        <span />
                        {status}
                      </span>
                    </div>

                    <p className="patient-specialty">
                      {admission.doctor?.specialty || "Medical consultation"}
                    </p>

                    <div className="patient-appointment-details">
                      <span>
                        <CalendarDays size={15} />
                        {formatDate(admission.appointmentDate)}
                      </span>

                      <span>
                        <Ticket size={15} />
                        Token #{getTokenNumber(admission.tokenNumber)}
                      </span>

                      <span>
                        <Wallet size={15} />
                        {formatMoney(admission.fee)}
                      </span>
                    </div>

                    {admission.reason && (
                      <p className="patient-appointment-reason">
                        <strong>Reason:</strong> {admission.reason}
                      </p>
                    )}
                  </div>

                  <div className="patient-appointment-action">
                    <button
                      type="button"
                      className="patient-download-button"
                      onClick={() => downloadToken(admission._id)}
                      disabled={downloadingId === admission._id}
                    >
                      <Download size={16} />
                      {downloadingId === admission._id
                        ? "Preparing..."
                        : "Download token"}
                    </button>

                    <span className="patient-token-caption">
                      PDF appointment token
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="patient-dashboard-footer">
        <span>MEDICARE HOSPITAL</span>
        <span>Your health journey, supported at every step.</span>
      </footer>
    </main>
  );
}
