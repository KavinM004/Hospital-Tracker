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
  Users,
  UserPlus,
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
  const [familyMembers, setFamilyMembers] = useState([]);

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingFamily, setSavingFamily] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [showFamilyForm, setShowFamilyForm] = useState(false);

  const [patientType, setPatientType] = useState("self");
  const [familyMemberId, setFamilyMemberId] = useState("");

  const [form, setForm] = useState({
    doctorId: "",
    patientName: "",
    patientAge: "",
    gender: "",
    phone: "",
    reason: "",
    appointmentDate: "",
  });

  const [familyForm, setFamilyForm] = useState({
    name: "",
    relationship: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
  });

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor._id === form.doctorId),
    [doctors, form.doctorId],
  );

  const selectedFamilyMember = useMemo(
    () => familyMembers.find((member) => member._id === familyMemberId),
    [familyMembers, familyMemberId],
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

  async function loadFamilyMembers() {
    if (!user) return;

    setLoadingFamily(true);

    try {
      const { data } = await api.get("/family");

      const list = Array.isArray(data?.familyMembers)
        ? data.familyMembers
        : Array.isArray(data)
          ? data
          : [];

      setFamilyMembers(list);
    } catch (err) {
      if (err.response?.status === 401) {
        await handleAuthFailure(err);
        return;
      }

      setError(
        getErrorMessage(
          err,
          "Unable to load family members. Please try again.",
        ),
      );
    } finally {
      setLoadingFamily(false);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    loadFamilyMembers();
  }, [user]);

  function change(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
  }

  function changeFamilyForm(event) {
    const { name, value } = event.target;

    setFamilyForm((previous) => ({
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

  function changePatientType(event) {
    const value = event.target.value;

    setPatientType(value);
    setFamilyMemberId("");
    setError("");

    if (value === "self") {
      setForm((previous) => ({
        ...previous,
        patientName: user?.name || "",
        patientAge: "",
        gender: "",
        phone: user?.phone || "",
      }));
    } else {
      setForm((previous) => ({
        ...previous,
        patientName: "",
        patientAge: "",
        gender: "",
        phone: "",
      }));
    }
  }

  function selectFamilyMember(event) {
    const memberId = event.target.value;
    const member = familyMembers.find((item) => item._id === memberId);

    setFamilyMemberId(memberId);
    setError("");

    if (member) {
      setForm((previous) => ({
        ...previous,
        patientName: member.name || "",
        gender: member.gender || "",
        phone: member.phone || "",
        patientAge: "",
      }));
    } else {
      setForm((previous) => ({
        ...previous,
        patientName: "",
        patientAge: "",
        gender: "",
        phone: "",
      }));
    }
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

  async function addFamilyMember(event) {
    event.preventDefault();
    setError("");

    if (!familyForm.name.trim()) {
      setError("Please enter the family member's name.");
      return;
    }

    if (!familyForm.relationship) {
      setError("Please select the relationship.");
      return;
    }

    if (!familyForm.dateOfBirth) {
      setError("Please enter the date of birth.");
      return;
    }

    if (familyForm.dateOfBirth > getTodayDate()) {
      setError("Date of birth cannot be in the future.");
      return;
    }

    if (!familyForm.gender) {
      setError("Please select the gender.");
      return;
    }

    setSavingFamily(true);

    try {
      const payload = {
        name: familyForm.name.trim(),
        relationship: familyForm.relationship,
        dateOfBirth: familyForm.dateOfBirth,
        gender: familyForm.gender,
        phone: familyForm.phone.trim(),
      };

      const { data } = await api.post("/family", payload);

      const newMember = data?.familyMember;

      if (!newMember?._id) {
        throw new Error("The server did not return the saved family member.");
      }

      setFamilyMembers((previous) => [...previous, newMember]);

      setPatientType("family");
      setFamilyMemberId(newMember._id);

      setForm((previous) => ({
        ...previous,
        patientName: newMember.name || "",
        gender: newMember.gender || "",
        phone: newMember.phone || "",
        patientAge: "",
      }));

      setFamilyForm({
        name: "",
        relationship: "",
        dateOfBirth: "",
        gender: "",
        phone: "",
      });

      setShowFamilyForm(false);
      setError("");
    } catch (err) {
      if (await handleAuthFailure(err)) return;

      setError(
        getErrorMessage(
          err,
          "Unable to save the family member. Please try again.",
        ),
      );
    } finally {
      setSavingFamily(false);
    }
  }

  async function downloadToken(admissionId) {
    setError("");
    setDownloading(true);

    let objectUrl;

    try {
      const response = await api.get(`/admissions/${admissionId}/token.pdf`, {
        responseType: "blob",
      });

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

    if (patientType === "family" && !familyMemberId) {
      setError("Please select a family member before continuing.");
      return;
    }

    if (patientType === "self") {
      const age = Number(form.patientAge);

      if (!Number.isInteger(age) || age < 0 || age > 120) {
        setError("Please enter a valid age between 0 and 120.");
        return;
      }

      if (!form.patientName.trim()) {
        setError("Please enter the patient's name.");
        return;
      }

      if (!form.gender) {
        setError("Please select the patient's gender.");
        return;
      }

      if (!form.phone.trim()) {
        setError("Please enter the patient's mobile number.");
        return;
      }
    } else {
      if (!selectedFamilyMember) {
        setError("Please select a valid saved family member.");
        return;
      }

      if (!selectedFamilyMember.phone && !form.phone.trim()) {
        setError("Please enter a contact number for the family member.");
        return;
      }
    }

    if (!form.reason.trim()) {
      setError("Please enter the reason for the visit.");
      return;
    }

    setBusy(true);

    try {
      const payload = {
        doctorId: form.doctorId,
        appointmentDate: form.appointmentDate,
        reason: form.reason.trim(),
        patientType,
      };

      if (patientType === "family") {
        payload.familyMemberId = familyMemberId;
        payload.phone = form.phone.trim();
      } else {
        payload.patientName = form.patientName.trim();
        payload.patientAge = Number(form.patientAge);
        payload.gender = form.gender;
        payload.phone = form.phone.trim();
      }

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
          <p className="muted">
            Book an appointment for yourself or a family member.
          </p>
        </div>
      </div>

      <form className="admission-layout" onSubmit={submit}>
        <section className="panel admission-fields">
          <div className="section-title">
            <span className="step-badge">01</span>
            <div>
              <h2>Who is this appointment for?</h2>
              <p className="muted">
                Choose yourself or someone in your family.
              </p>
            </div>
          </div>

          <label>
            Appointment for
            <select value={patientType} onChange={changePatientType}>
              <option value="self">Myself</option>
              <option value="family">Family member</option>
            </select>
          </label>

          {patientType === "family" && (
            <div className="family-selection">
              <label>
                Select family member
                <select
                  value={familyMemberId}
                  onChange={selectFamilyMember}
                  required
                >
                  <option value="">Choose a family member</option>

                  {familyMembers.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} ({member.relationship})
                    </option>
                  ))}
                </select>
              </label>

              {loadingFamily && (
                <p className="tiny muted">Loading family members...</p>
              )}

              {!loadingFamily && familyMembers.length === 0 && (
                <p className="tiny muted">
                  You have not added any family members yet.
                </p>
              )}

              <button
                type="button"
                className="btn secondary small"
                onClick={() => {
                  setShowFamilyForm((previous) => !previous);
                  setError("");
                }}
              >
                <UserPlus size={16} />
                {showFamilyForm ? "Cancel" : "Add family member"}
              </button>

              {showFamilyForm && (
                <div className="family-add-panel">
                  <h3>
                    <Users size={18} /> Add a family member
                  </h3>

                  <div className="field-grid">
                    <label>
                      Full name
                      <input
                        name="name"
                        value={familyForm.name}
                        onChange={changeFamilyForm}
                        maxLength={100}
                        autoComplete="off"
                        required
                      />
                    </label>

                    <label>
                      Relationship
                      <select
                        name="relationship"
                        value={familyForm.relationship}
                        onChange={changeFamilyForm}
                        required
                      >
                        <option value="">Select relationship</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>

                    <label>
                      Date of birth
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={familyForm.dateOfBirth}
                        onChange={changeFamilyForm}
                        max={getTodayDate()}
                        required
                      />
                    </label>

                    <label>
                      Gender
                      <select
                        name="gender"
                        value={familyForm.gender}
                        onChange={changeFamilyForm}
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">
                          Prefer not to say
                        </option>
                      </select>
                    </label>

                    <label className="span-2">
                      Mobile number
                      <input
                        type="tel"
                        name="phone"
                        value={familyForm.phone}
                        onChange={changeFamilyForm}
                        maxLength={20}
                        placeholder="Contact number"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="btn primary full"
                    onClick={(event) => {
                      const formElement = event.currentTarget
                        .closest(".family-add-panel")
                        ?.querySelector("input, select");

                      const panel =
                        event.currentTarget.closest(".family-add-panel");

                      if (!panel) return;

                      const inputs = panel.querySelectorAll("input, select");

                      for (const input of inputs) {
                        if (!input.checkValidity()) {
                          input.reportValidity();
                          return;
                        }
                      }

                      addFamilyMember({
                        preventDefault: () => {},
                      });
                    }}
                    disabled={savingFamily}
                  >
                    {savingFamily
                      ? "Saving family member..."
                      : "Save family member"}
                  </button>
                </div>
              )}

              {selectedFamilyMember && (
                <div className="secure-note">
                  <CheckCircle2 size={16} />
                  Booking for {selectedFamilyMember.name}.
                </div>
              )}
            </div>
          )}

          <div className="section-title second">
            <span className="step-badge">02</span>
            <div>
              <h2>Patient details</h2>
              <p className="muted">
                {patientType === "family"
                  ? "Details are taken from the selected family member."
                  : "Please provide accurate contact information."}
              </p>
            </div>
          </div>

          {patientType === "self" ? (
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
            </div>
          ) : (
            <div className="field-grid">
              <label>
                Patient full name
                <input
                  value={selectedFamilyMember?.name || ""}
                  readOnly
                  placeholder="Select a family member"
                />
              </label>

              <label>
                Gender
                <input
                  value={selectedFamilyMember?.gender || ""}
                  readOnly
                  placeholder="Gender"
                />
              </label>

              <label className="span-2">
                Contact number
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={change}
                  placeholder="Enter a contact number if none is saved"
                  maxLength={20}
                  required={!selectedFamilyMember?.phone}
                />
              </label>

             < label className="span-2">
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
          )}

          <div className="section-title second">
            <span className="step-badge">03</span>
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
              busy ||
              loadingDoctors ||
              doctors.length === 0 ||
              !form.doctorId ||
              loadingFamily ||
              savingFamily
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
            <span>Patient</span>
            <strong>
              {patientType === "family"
                ? selectedFamilyMember?.name || "Not selected"
                : form.patientName || "Myself"}
            </strong>
          </div>

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
