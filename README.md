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


* **Operational Monitoring:** Real-time tracking of gym attendance and payment transactions[cite: 2, 3, 6].
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

---

## ⚠️ System Limitations & Disclaimers

While FITMETRICS provides robust analytics and management tools, it is designed with the following boundaries:

* **No Medical Advice:** The system does not provide medical/health advice, monitor medical conditions, or create workout/diet plans for members[cite: 2, 7].
* **Predictive Accuracy:** Forecasts and AI recommendations are meant as decision-support tools only; the system does not guarantee 100% accuracy or member renewal rates[cite: 2, 7].
* **Financial Scope:** The platform handles transaction records but does not act as a full accounting, payroll, or tax filing system[cite: 2, 7].
* **Target Audience:** Designed specifically for the client's participating gym or selected local fitness centers, rather than managing multiple unrelated businesses[cite: 2, 7].

---

## 👥 Meet The Team

Developed for **IT 313 - System Analysis and Design** at **Batangas State University - The National Engineering University** (BSIT BA-3103 - Group 2):

* **Michael Andre S. Tanza** – Group Leader


* **Daniel Rodge A. Caindoy** – Member


* **Julianne Margarette G. Cuya** – Member


* **Zhaider M. Mendoza** – Member



---

## 🤝 Acknowledgements

* **Client:** Mr. Ariel N. Mendoza[cite: 1]
* **SDG Alignment:** This project supports **SDG 8 (Decent Work and Economic Growth)** by optimizing business structures, improving resource management, and fostering sustainable growth for local enterprises[cite: 3].
