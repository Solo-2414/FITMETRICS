# FITMETRICS

**Gym Management Analytics and Member Retention Platform**

A web-based business intelligence platform designed to centralize operations, track attendance, and provide predictive analytics for local fitness centers.

---

## 📖 About The Project

Many local fitness centers still rely on manual methods to record member information, attendance, payments, and membership status. This traditional approach often results in inefficient operational workflows, missing expired memberships, and difficulty in determining which members are at risk of churning. Furthermore, without proper data analysis, gym owners lack the insights needed to make informed business decisions.

**FITMETRICS** is developed to solve this by streamlining daily operations and converting historical business data into actionable insights. The platform automates administrative tasks, provides self-service tracking, and equips management with predictive analytics and AI-driven decision-support tools.

---

## 🛠️ Tech Stack

---

## ✨ Key Features

* **Member & Membership Management:** Digital registration, member record updates, transaction recording, and self-service tracking.


* **Operational Monitoring:** Real-time tracking of gym attendance and payment transactions.
* **Business Analytics Dashboards:** Visual representation of historical gym data and operational reports using interactive charts and dashboards.


* **Predictive Retention Analytics:** Algorithms that analyze member activity to forecast gym membership trends and identify members at risk of leaving.


* **AI-Powered Insights:** Automated, data-backed insights and actionable business recommendations.


* **Interactive "What-If" AI Chatbot:** A built-in AI assistant allowing business owners to query hypothetical scenarios and evaluate potential business changes.



---

## 🚀 Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

Make sure you have the following installed:

* [Node.js](https://nodejs.org/) (v18.x or higher)
* [npm](https://www.npmjs.com/) (comes with Node.js)
* [PostgreSQL](https://www.postgresql.org/download/) (v14.x or higher running locally or via service)

### Environment Setup

Create a `.env` file in the backend directory with the following variables:

```env
PORT=5000
DATABASE_URL=postgresql://postgres_user:postgres_password@localhost:5432/fitmetrics_db
JWT_SECRET=your_jwt_secret_key
FACEPP_API_KEY=your_face_plus_plus_api_key
FACEPP_API_SECRET=your_face_plus_plus_api_secret
OCR_SPACE_API_KEY=helloworld

```

### Installation & Run

1. **Clone the repository**
```sh
git clone https://github.com/your-username/FITMETRICS.git
cd FITMETRICS

```


2. **Set up the Database**
* Create a PostgreSQL database named `fitmetrics_db`.
* Run your database migrations or SQL scripts to build the schema.


3. **Install and Start the Backend (Node.js)**
```sh
cd backend
npm install
npm run dev

```


4. **Install and Start the Frontend (React)**
```sh
cd ../frontend
npm install
npm start

```


5. **Access the application**
Open your browser and navigate to `http://localhost:3000`.

### Authentication API

The backend exposes:

* `POST /api/auth/register` - multipart registration with `fullName`, `email`,
  `password`, `role`, `idImage`, and `faceImage`. OCR.space validates that the
  submitted name appears on the ID before the face reference is saved.
* `POST /api/auth/login` - validates the password and returns five-minute
  face-verification and liveness tokens.
* `POST /api/auth/verify-face` - accepts a multipart `faceImage` only after the
  browser completes the blink and head-turn liveness challenge. Face++ then
  compares it to the registered reference and returns an eight-hour JWT.
* `GET /api/admin/users` - example protected admin-only endpoint.

Copy `backend/.env.example` to `backend/.env` and provide the Face++ API key
and secret before using registration or facial verification. User records are
stored in `backend/data/fitmetrics.sqlite` for local development; use
PostgreSQL (or another encrypted store) before production because biometric
data requires strong access controls, retention limits, and explicit member
consent.

To replace a development account's placeholder face with a real enrollment
photo, run this from `backend`:

```powershell
npm run enroll:face -- clerk1.test@fitmetrics.local C:\path\to\clerk-face.jpg
```

Use a clear image of the actual clerk, and repeat for `clerk2` or `admin` as
needed. The shared `IDImage.jpg` fixture is not a valid production identity.

The Vite client uses `VITE_API_URL` when set and otherwise calls
`http://localhost:5000/api`.

For local UI testing only, run `npm run seed:test-accounts` from `backend`.
This creates six development accounts with placeholder biometric records.
They are not valid for production and cannot complete Face++ verification
until registered with real ID and face images.

Development identity fixtures belong under `backend/fixtures/identity/` and
are ignored by Git. Running `npm run seed:test-accounts` assigns the provided
`IDImage.jpg` and the name `Michael Andre Tanza` to all six development
accounts so their roles can be tested with one shared identity fixture. This
is intentionally development-only and must not be used for real identity
verification.

---

## ⚠️ System Limitations & Disclaimers

While FITMETRICS provides robust analytics and management tools, it is designed with the following boundaries:

* **No Medical Advice:** The system does not provide medical/health advice, monitor medical conditions, or create workout/diet plans for members.
* **Predictive Accuracy:** Forecasts and AI recommendations are meant as decision-support tools only; the system does not guarantee 100% accuracy or member renewal rates.
* **Financial Scope:** The platform handles transaction records but does not act as a full accounting, payroll, or tax filing system.
* **Target Audience:** Designed specifically for the client's participating gym or selected local fitness centers, rather than managing multiple unrelated businesses.

---

## 👥 Meet The Team

Developed for **IT 313 - System Analysis and Design** at **Batangas State University - The National Engineering University** (BSIT BA-3103 - Group 2):

* **Michael Andre S. Tanza** – Group Leader


* **Daniel Rodge A. Caindoy** – Member


* **Julianne Margarette G. Cuya** – Member


* **Zhaider M. Mendoza** – Member



---

## 🤝 Acknowledgements

* **Client:** Mr. Ariel N. Mendoza
* **SDG Alignment:** This project supports **SDG 8 (Decent Work and Economic Growth)** by optimizing business structures, improving resource management, and fostering sustainable growth for local enterprises.
