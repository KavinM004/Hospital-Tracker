import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  RefreshCw,
  UserRound,
  AlertCircle,
  Stethoscope,
} from "lucide-react";

import api from "../api";
import { useAuth } from "../context/AuthContext";

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getErrorMessage(err, fallback) {
  if (err.response?.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (err.response?.status === 403) {
    return "You do not have permission to perform this action.";
  }

  return err.response?.data?.message || err.message || fallback;
}

function formatMoney(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdmissionForm() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    doctorId: "",
    patientName: "",
    patientAge: "",
    gender: "",
    phone: "",
    reason: "",
    appointmentDate: "",
  });

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor._id === form.doctorId),
    [doctors, form.doctorId],
  );

  async function loadDoctors() {
    setLoadingDoctors(true);
    setError("");

    try {
      const { data } = await api.get("/doctors");

      const list = Array.isArray(data?.doctors)
        ? data.doctors
        : Array.isArray(data)
          ? data
          : [];

      setDoctors(list);

      if (list.length === 0) {
        setError(
          "No active doctors were found. Please add doctors to your database and try again.",
        );
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load doctors. Check that the backend and MongoDB Atlas are running.",
        ),
      );
    } finally {
      setLoadingDoctors(false);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  function change(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
  }

  function selectDoctor(doctorId) {
    setForm((previous) => ({
      ...previous,
      doctorId,
    }));

    if (error) setError("");
  }

  async function handleAuthFailure(err) {
    if (err.response?.status === 401) {
      logout();
      navigate("/login", {
        replace: true,
        state: {
          message: "Please sign in again before booking an appointment.",
        },
      });

      return true;
    }

    return false;
  }

  async function downloadToken(admissionId) {
    setError("");
    setDownloading(true);

    let objectUrl;

    try {
      const response = await api.get(`/admissions/${admissionId}/token.pdf`, {
        responseType: "blob",
      });

      // Axios may receive a JSON error as a Blob.
      if (response.data.type && !response.data.type.includes("pdf")) {
        throw new Error("The server did not return a PDF file.");
      }

      objectUrl = URL.createObjectURL(response.data);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `medicare-token-${admissionId}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      if (await handleAuthFailure(err)) return;

      setError(
        getErrorMessage(
          err,
          "Unable to download the token PDF. Please try again.",
        ),
      );
    } finally {
      if (objectUrl) {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }

      setDownloading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError("Please sign in before booking an appointment.");
      navigate("/login");
      return;
    }

    if (!form.doctorId) {
      setError("Please select a doctor before continuing.");
      return;
    }

    if (!form.appointmentDate) {
      setError("Please select an appointment date.");
      return;
    }

    if (form.appointmentDate < getTodayDate()) {
      setError("Please choose today or a future appointment date.");
      return;
    }

    const age = Number(form.patientAge);

    if (!Number.isInteger(age) || age < 0 || age > 120) {
      setError("Please enter a valid age between 0 and 120.");
      return;
    }

    setBusy(true);

    try {
      const payload = {
        ...form,
        patientName: form.patientName.trim(),
        patientAge: age,
        phone: form.phone.trim(),
        reason: form.reason.trim(),
      };

      const { data } = await api.post("/admissions", payload);

      if (!data?.admission?._id) {
        throw new Error("The server did not return the created admission.");
      }

      setSuccess(data.admission);
    } catch (err) {
      if (await handleAuthFailure(err)) return;

      setError(
        getErrorMessage(
          err,
          "Could not create the admission. Please check your details and try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function payNow() {
    if (!success?._id || paying) return;

    setError("");
    setPaying(true);

    try {
      const { data: order } = await api.post("/payments/create-order", {
        admissionId: success._id,
      });

      if (!window.Razorpay) {
        throw new Error(
          "Razorpay checkout is unavailable. Check your internet connection and ensure the Razorpay checkout script is included in index.html.",
        );
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "MediCare Hospital",
        description: "Doctor consultation fee",
        order_id: order.orderId,
        prefill: {
          name: success.patientName,
          contact: success.phone,
        },
        theme: { color: "#0C9F91" },

        handler: async (response) => {
          try {
            const verified = await api.post("/payments/verify", {
              admissionId: success._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setSuccess(verified.data.admission);
            setError("");
          } catch (err) {
            if (await handleAuthFailure(err)) return;

            setError(
              getErrorMessage(
                err,
                "Payment verification failed. Contact hospital support before retrying.",
              ),
            );
          } finally {
            setPaying(false);
          }
        },

        modal: {
          ondismiss: () => setPaying(false),
        },
      });

      checkout.on("payment.failed", () => {
        setError("Payment was not completed. You can try again.");
        setPaying(false);
      });

      checkout.open();
    } catch (err) {
      if (!(await handleAuthFailure(err))) {
        setError(
          getErrorMessage(err, "Unable to start payment. Please try again."),
        );
      }

      setPaying(false);
    }
  }

  if (success) {
    return (
      <main className="content-page success-page">
        <div className="success-card">
          <span className="success-icon">
            <CheckCircle2 size={42} />
          </span>

          <span className="eyebrow">REGISTRATION CREATED</span>

          <h1>Your patient token is ready</h1>

          <p className="muted">
            Your registration has been saved. Payment status is currently{" "}
            <strong>{success.paymentStatus || "PENDING"}</strong>.
          </p>

          <div className="token-preview">
            <span>YOUR TOKEN NUMBER</span>
            <strong>
              #{String(success.tokenNumber ?? "").padStart(3, "0")}
            </strong>
            <small>{success.tokenDate}</small>
          </div>

          <div className="success-details">
            <div>
              <span>Patient</span>
              <strong>{success.patientName}</strong>
            </div>

            <div>
              <span>Doctor</span>
              <strong>
                {success.doctor?.name ||
                  selectedDoctor?.name ||
                  "Assigned doctor"}
              </strong>
            </div>

            <div>
              <span>Appointment date</span>
              <strong>
                {success.appointmentDate
                  ? new Date(success.appointmentDate).toLocaleDateString(
                      "en-IN",
                    )
                  : "—"}
              </strong>
            </div>

            <div>
              <span>Consultation fee</span>
              <strong>{formatMoney(success.fee)}</strong>
            </div>
          </div>

          <p className="notice">
            Keep your token for your visit. Payment is confirmed only after
            server-side verification.
          </p>

          {success.paymentStatus !== "PAID" && (
            <button
              type="button"
              className="btn primary full"
              onClick={payNow}
              disabled={paying}
            >
              <CreditCard size={17} />
              {paying ? "Starting payment..." : "Pay consultation fee"}
            </button>
          )}

          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}

          <button
            type="button"
            className="btn secondary full"
            onClick={() => downloadToken(success._id)}
            disabled={downloading}
          >
            <Download size={17} />
            {downloading ? "Preparing PDF..." : "Download token PDF"}
          </button>

          <Link className="btn secondary full" to="/dashboard">
            Go to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="content-page page-watermark">
      <Link to="/dashboard" className="back-link">
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <div className="page-heading">
        <div>
          <span className="eyebrow">PATIENT ADMISSION</span>
          <h1>Register for a visit</h1>
          <p className="muted">Enter patient details and select a doctor.</p>
        </div>
      </div>

      <form className="admission-layout" onSubmit={submit}>
        <section className="panel admission-fields">
          <div className="section-title">
            <span className="step-badge">01</span>
            <div>
              <h2>Patient details</h2>
              <p className="muted">
                Please provide accurate contact information.
              </p>
            </div>
          </div>

          <div className="field-grid">
            <label>
              Patient full name
              <input
                name="patientName"
                value={form.patientName}
                onChange={change}
                placeholder="Full name"
                required
                maxLength={100}
                autoComplete="name"
              />
            </label>

            <label>
              Age
              <input
                name="patientAge"
                type="number"
                min="0"
                max="120"
                step="1"
                value={form.patientAge}
                onChange={change}
                placeholder="Age in years"
                required
              />
            </label>

            <label>
              Gender
              <select
                name="gender"
                value={form.gender}
                onChange={change}
                required
              >
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>

            <label>
              Mobile number
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={change}
                placeholder="Contact number"
                required
                maxLength={20}
                autoComplete="tel"
              />
            </label>

            <label className="span-2">
              Reason for visit
              <textarea
                name="reason"
                value={form.reason}
                onChange={change}
                placeholder="Brief reason for consultation"
                required
                maxLength={500}
                rows={3}
              />
            </label>
          </div>

          <div className="section-title second">
            <span className="step-badge">02</span>
            <div>
              <h2>Doctor & appointment</h2>
              <p className="muted">
                Choose the doctor that best fits your needs.
              </p>
            </div>
          </div>

          {loadingDoctors ? (
            <div className="doctor-loading">
              <RefreshCw size={20} className="patient-spinning" />
              <p>Loading available doctors...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="alert error" role="alert">
              <AlertCircle size={17} />
              No active doctors are available. Check your backend and MongoDB
              Atlas doctor records.
              <button
                type="button"
                className="btn secondary small"
                onClick={loadDoctors}
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="doctor-grid">
              {doctors.map((doctor) => (
                <button
                  type="button"
                  key={doctor._id}
                  className={`doctor-option ${
                    form.doctorId === doctor._id ? "selected" : ""
                  }`}
                  onClick={() => selectDoctor(doctor._id)}
                  aria-pressed={form.doctorId === doctor._id}
                >
                  <span className="doctor-avatar">
                    <UserRound />
                  </span>

                  <span className="doctor-info">
                    <strong>{doctor.name}</strong>
                    <small>
                      {doctor.specialty}
                      {doctor.qualification ? ` · ${doctor.qualification}` : ""}
                    </small>
                    <b>{formatMoney(doctor.fee)}</b>
                  </span>

                  <span className="select-circle">
                    {form.doctorId === doctor._id ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}

          <label className="date-field">
            Appointment date
            <div className="input-wrap">
              <CalendarDays size={17} />
              <input
                name="appointmentDate"
                type="date"
                value={form.appointmentDate}
                min={getTodayDate()}
                onChange={change}
                required
              />
            </div>
          </label>

          {error && (
            <div className="alert error" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn primary full"
            disabled={
              busy || loadingDoctors || doctors.length === 0 || !form.doctorId
            }
          >
            {busy ? (
              <>
                <RefreshCw size={17} className="patient-spinning" />
                Saving registration...
              </>
            ) : (
              <>
                <CheckCircle2 size={17} />
                Create admission & token
              </>
            )}
          </button>

          {!user && (
            <p className="tiny muted">
              You must sign in before creating an appointment.
            </p>
          )}
        </section>

        <aside className="panel fee-panel">
          <span className="fee-icon">
            <CreditCard size={23} />
          </span>

          <h2>Fee summary</h2>
          <p className="muted">
            Review the consultation charge before continuing.
          </p>

          <div className="fee-row">
            <span>Doctor</span>
            <strong>{selectedDoctor?.name || "Not selected"}</strong>
          </div>

          <div className="fee-row">
            <span>Consultation</span>
            <strong>
              {selectedDoctor ? formatMoney(selectedDoctor.fee) : "—"}
            </strong>
          </div>

          <div className="fee-total">
            <span>Total due</span>
            <strong>
              {selectedDoctor ? formatMoney(selectedDoctor.fee) : "₹0"}
            </strong>
          </div>

          <div className="secure-note">
            <CheckCircle2 size={16} />
            Payment is verified on the server when configured.
          </div>

          <p className="tiny muted">
            Admissions are saved with pending payment status. Razorpay test
            credentials are required to enable online checkout.
          </p>

          <div className="doctor-fee-help">
            <Stethoscope size={17} />
            <span>
              Select a doctor to see the consultation fee before booking.
            </span>
          </div>
        </aside>
      </form>
    </main>
  );
}
