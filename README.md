# MediCare Hospital — MERN Patient Admission System

Intermediate-level full-stack starter project for patient registration, doctor selection, consultation-fee payment workflow, and downloadable PDF token sheets.

## Included
- React + Vite + React Router + Axios frontend
- Express + MongoDB/Mongoose backend
- Email/password signup and login using bcrypt + JWT
- Google sign-in via Google Identity Services (ID token verified on the backend)
- Doctor list and seed script
- Patient admission registration
- Unique daily token number
- PDF token sheet download with PDFKit
- Razorpay order creation and server-side payment signature verification (optional; requires Razorpay keys)
- Responsive blue/teal UI and MediCare logo placement

## Requirements
- Node.js 20+
- MongoDB local or Atlas
- Google OAuth Web Client ID for Google sign-in
- Razorpay account/keys only if you want to enable live/test payments

## 1. Backend setup
```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```
Fill in `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and Google/Razorpay credentials in `.env`.

## 2. Frontend setup
Open a second terminal:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Set `VITE_API_URL=http://localhost:5000/api` and `VITE_GOOGLE_CLIENT_ID` in `client/.env`.

## 3. Add the logo
Copy your transparent PNG into `client/public/images/medicare-logo.png`.
If you do not add it, the app displays a simple text brand fallback.

## Demo doctor accounts
The seed script creates sample doctors (not login accounts). Replace their names, specialties, fees, and availability with real clinic data before use.

## Important payment note
- Without Razorpay keys, the app can create admissions in `PENDING_PAYMENT` state for UI testing, but it will not mark a payment as paid.
- For payment, use Razorpay Test Mode first. Never trust a payment status sent only by the browser.
- Do not store card details in this application.
- In a production deployment, configure HTTPS, secure cookies/token storage strategy, rate limiting, audit logs, backups, access controls, and applicable healthcare privacy/legal requirements.

## API routes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `GET /api/doctors`
- `POST /api/admissions` (authenticated)
- `GET /api/admissions/mine` (authenticated)
- `GET /api/admissions/:id/token.pdf` (authenticated, owner-only)
- `POST /api/payments/create-order` (authenticated)
- `POST /api/payments/verify` (authenticated)

## Token workflow
1. Patient signs in.
2. Selects a doctor and enters admission details.
3. The backend validates the doctor and fee, allocates a daily token, and saves the admission.
4. If Razorpay is configured, the frontend opens checkout and verifies the signed payment response with the backend.
5. The patient can download a PDF token sheet.
