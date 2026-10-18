import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  LogOut,
  Plus,
  RefreshCw,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

const emptyDoctor = {
  name: "",
  specialty: "",
  qualification: "MBBS",
  fee: "",
  availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
};

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function getRows(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN");
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function StatCard({ title, value, icon: Icon, detail }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-top">
        <span>{title}</span>
        <span className="admin-stat-icon">
          <Icon size={20} />
        </span>
      </div>
      <h2>{value ?? 0}</h2>
      <p>{detail}</p>
    </article>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState({});
  const [doctors, setDoctors] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [doctorForm, setDoctorForm] = useState(emptyDoctor);
  const [editingId, setEditingId] = useState("");
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [overviewRes, doctorsRes, admissionsRes, paymentsRes] =
        await Promise.all([
          api.get("/admin/overview"),
          api.get("/admin/doctors"),
          api.get("/admin/admissions"),
          api.get("/admin/payments"),
        ]);

      setOverview(overviewRes.data?.overview ?? overviewRes.data ?? {});
      setDoctors(getRows(doctorsRes.data, "doctors"));
      setAdmissions(getRows(admissionsRes.data, "admissions"));
      setPayments(getRows(paymentsRes.data, "payments"));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load admin data. Check your admin API routes and login session.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function startAddDoctor() {
    setEditingId("");
    setDoctorForm({ ...emptyDoctor });
    setShowDoctorForm(true);
    setError("");
    setSuccess("");
  }

  function startEditDoctor(doctor) {
    setEditingId(doctor._id);
    setDoctorForm({
      name: doctor.name || "",
      specialty: doctor.specialty || "",
      qualification: doctor.qualification || "MBBS",
      fee: doctor.fee ?? "",
      availableDays: doctor.availableDays || [],
    });
    setShowDoctorForm(true);
    setError("");
    setSuccess("");
  }

  function updateDoctorField(event) {
    const { name, value } = event.target;
    setDoctorForm((current) => ({ ...current, [name]: value }));
  }

  function toggleDay(day) {
    setDoctorForm((current) => ({
      ...current,
      availableDays: current.availableDays.includes(day)
        ? current.availableDays.filter((item) => item !== day)
        : [...current.availableDays, day],
    }));
  }

  async function saveDoctor(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...doctorForm,
        fee: Number(doctorForm.fee),
      };

      if (editingId) {
        await api.patch(`/admin/doctors/${editingId}`, payload);
        setSuccess("Doctor details updated successfully.");
      } else {
        await api.post("/admin/doctors", payload);
        setSuccess("Doctor added successfully.");
      }

      setShowDoctorForm(false);
      setDoctorForm({ ...emptyDoctor });
      setEditingId("");
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save doctor details.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDoctorStatus(doctor) {
    setError("");
    setSuccess("");

    try {
      await api.patch(`/admin/doctors/${doctor._id}/status`, {
        active: !doctor.active,
      });
      setSuccess(
        `${doctor.name} is now ${doctor.active ? "inactive" : "active"}.`,
      );
      await loadDashboard();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update doctor status.",
      );
    }
  }

  function signOut() {
    logout();
    navigate("/admin/login", { replace: true });
  }

  const totalDoctors =
    overview.totalDoctors ?? overview.doctors ?? doctors.length;
  const totalAdmissions =
    overview.totalAdmissions ?? overview.admissions ?? admissions.length;
  const paidAdmissions =
    overview.paidAdmissions ??
    overview.paid ??
    admissions.filter((item) => item.paymentStatus === "PAID").length;
  const paidRevenue =
    overview.paidRevenue ??
    payments
      .filter((item) => item.paymentStatus === "PAID")
      .reduce((total, item) => total + Number(item.fee || 0), 0);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Logo />

        <div className="admin-sidebar-label">ADMINISTRATION</div>

        <nav className="admin-nav">
          {[
            ["overview", "Overview", Activity],
            ["doctors", "Doctors", Stethoscope],
            ["admissions", "Admissions", CalendarDays],
            ["payments", "Payments", CircleDollarSign],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              className={`admin-nav-item ${tab === value ? "active" : ""}`}
              onClick={() => setTab(value)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-user">
            <span className="admin-avatar">
              {(user?.name || "A").charAt(0).toUpperCase()}
            </span>
            <span>
              <strong>{user?.name || "Administrator"}</strong>
              <small>Hospital Admin</small>
            </span>
          </div>

          <button type="button" className="admin-nav-item" onClick={signOut}>
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">MEDICARE HOSPITAL</p>
            <h1>
              {tab === "overview"
                ? "Dashboard overview"
                : tab === "doctors"
                  ? "Doctor management"
                  : tab === "admissions"
                    ? "Patient admissions"
                    : "Payment records"}
            </h1>
            <p className="muted">
              Manage your hospital operations in one place.
            </p>
          </div>

          <button
            type="button"
            className="btn secondary"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert success" role="status">
            {success}
          </div>
        )}

        {loading ? (
          <div className="admin-loading">Loading hospital data...</div>
        ) : (
          <>
            {tab === "overview" && (
              <>
                <section className="admin-stats-grid">
                  <StatCard
                    title="Total doctors"
                    value={totalDoctors}
                    icon={Stethoscope}
                    detail={`${overview.activeDoctors ?? doctors.filter((d) => d.active).length} active doctors`}
                  />
                  <StatCard
                    title="Total admissions"
                    value={totalAdmissions}
                    icon={Users}
                    detail={`${overview.pendingAdmissions ?? admissions.filter((a) => a.paymentStatus === "PENDING").length} pending payments`}
                  />
                  <StatCard
                    title="Paid admissions"
                    value={paidAdmissions}
                    icon={CheckCircle2}
                    detail="Successfully paid"
                  />
                  <StatCard
                    title="Paid revenue"
                    value={money(paidRevenue)}
                    icon={CircleDollarSign}
                    detail="Confirmed payments"
                  />
                </section>

                <section className="admin-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h2>Recent admissions</h2>
                      <p className="muted">Latest patient booking records</p>
                    </div>
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() => setTab("admissions")}
                    >
                      View all
                    </button>
                  </div>

                  <AdmissionTable rows={admissions.slice(0, 5)} />
                </section>
              </>
            )}

            {tab === "doctors" && (
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>Doctors</h2>
                    <p className="muted">
                      Add doctors, edit details, or change availability.
                    </p>
                  </div>
                  <button
                    className="btn primary"
                    type="button"
                    onClick={startAddDoctor}
                  >
                    <Plus size={17} />
                    Add doctor
                  </button>
                </div>

                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Doctor</th>
                        <th>Specialty</th>
                        <th>Fee</th>
                        <th>Available days</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((doctor) => (
                        <tr key={doctor._id}>
                          <td>
                            <strong>{doctor.name}</strong>
                            <small>{doctor.qualification}</small>
                          </td>
                          <td>{doctor.specialty}</td>
                          <td>{money(doctor.fee)}</td>
                          <td>
                            {(doctor.availableDays || []).join(", ") || "—"}
                          </td>
                          <td>
                            <span
                              className={`status-pill ${doctor.active ? "paid" : "failed"}`}
                            >
                              {doctor.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <div className="admin-actions">
                              <button
                                type="button"
                                className="btn small secondary"
                                onClick={() => startEditDoctor(doctor)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn small secondary"
                                onClick={() => toggleDoctorStatus(doctor)}
                              >
                                {doctor.active ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {doctors.length === 0 && (
                        <tr>
                          <td colSpan="6">No doctors found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {tab === "admissions" && (
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>All admissions</h2>
                    <p className="muted">Patient and appointment details</p>
                  </div>
                </div>
                <AdmissionTable rows={admissions} />
              </section>
            )}

            {tab === "payments" && (
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>Payments</h2>
                    <p className="muted">
                      Payment status and transaction references
                    </p>
                  </div>
                </div>

                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Amount</th>
                        <th>Order ID</th>
                        <th>Payment ID</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id}>
                          <td>
                            {payment.patientName ||
                              payment.patient?.name ||
                              "—"}
                          </td>
                          <td>
                            {payment.doctor?.name || payment.doctorName || "—"}
                          </td>
                          <td>{money(payment.fee)}</td>
                          <td>{payment.paymentOrderId || "—"}</td>
                          <td>{payment.paymentId || "—"}</td>
                          <td>
                            <Status value={payment.paymentStatus} />
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan="6">No payment records found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {showDoctorForm && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowDoctorForm(false);
            }
          }}
        >
          <section
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-form-title"
          >
            <div className="admin-panel-heading">
              <div>
                <h2 id="doctor-form-title">
                  {editingId ? "Edit doctor" : "Add a doctor"}
                </h2>
                <p className="muted">Enter the doctor's information below.</p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close form"
                onClick={() => setShowDoctorForm(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="form-stack" onSubmit={saveDoctor}>
              <label>
                Doctor name
                <input
                  name="name"
                  value={doctorForm.name}
                  onChange={updateDoctorField}
                  required
                />
              </label>

              <label>
                Specialty
                <input
                  name="specialty"
                  value={doctorForm.specialty}
                  onChange={updateDoctorField}
                  required
                />
              </label>

              <label>
                Qualification
                <input
                  name="qualification"
                  value={doctorForm.qualification}
                  onChange={updateDoctorField}
                  required
                />
              </label>

              <label>
                Consultation fee (₹)
                <input
                  name="fee"
                  type="number"
                  min="0"
                  value={doctorForm.fee}
                  onChange={updateDoctorField}
                  required
                />
              </label>

              <fieldset className="admin-days">
                <legend>Available days</legend>
                <div className="admin-days-grid">
                  {days.map((day) => (
                    <label key={day} className="admin-day-option">
                      <input
                        type="checkbox"
                        checked={doctorForm.availableDays.includes(day)}
                        onChange={() => toggleDay(day)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                className="btn primary full"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update doctor"
                    : "Add doctor"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Status({ value }) {
  const status = String(value || "PENDING").toUpperCase();
  const className =
    status === "PAID" ? "paid" : status === "FAILED" ? "failed" : "pending";

  return <span className={`status-pill ${className}`}>{status}</span>;
}

function AdmissionTable({ rows }) {
  return (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Appointment</th>
            <th>Phone</th>
            <th>Fee</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((admission) => (
            <tr key={admission._id}>
              <td>
                <strong>
                  {admission.patientName || admission.patient?.name || "—"}
                </strong>
                <small>
                  {admission.patientAge ? `${admission.patientAge} years` : ""}
                  {admission.gender ? ` · ${admission.gender}` : ""}
                </small>
              </td>
              <td>
                {admission.doctor?.name || admission.doctorName || "—"}
                <small>{admission.doctor?.specialty || ""}</small>
              </td>
              <td>{formatDate(admission.appointmentDate)}</td>
              <td>{admission.phone || admission.patient?.phone || "—"}</td>
              <td>{money(admission.fee)}</td>
              <td>
                <Status value={admission.paymentStatus} />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan="6">No admissions found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
