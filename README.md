# 🎓 College ERP & Automated Timetable Studio

> A modern, Apple-inspired College ERP and Academic Governance Platform featuring an intelligent constraint-satisfaction timetable generation engine, live attendance tracking with real-time campus clock synchronization, and dedicated role-based portals for College Admin, Department Head (HOD), Faculty, Directorate/Principal, and Students.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF.svg?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-06B6D4.svg?logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57.svg?logo=sqlite&logoColor=white)

---

## ✨ Key Capabilities

### 1. ⚙️ Automated Timetable Generation Studio
* **5-Stage Academic Wizard:** Scope selection, academic requirements, institutional constraint tuning, CSP backtracking generation, and interactive review & publication.
* **Institutional Room & Floor Policy:**
  * **Approved Computer Labs:** Priority scheduling in **Room 107** (Primary Lab) and fallback allocation across **103, G01, and G03** with mandatory 2-slot consecutive pairing.
  * **Second Floor Theory Rule:** Theory lectures are allocated strictly to **Second Floor Classrooms (Rooms 201 to 208)**. Ground floor non-lab rooms are locked out.
* **Anti-Clumping Heuristics:** Enforces healthy academic session distribution—preventing multiple consecutive lectures of the same subject on any single day.
* **Flexible Date Windows:** Supports academic week generation or custom multi-day ranges (e.g. 11th–12th) with proportional lecture scaling.
* **Institutional Shift Locks (C-09):** Enforces contract shift boundaries (Morning vs. Afternoon) per faculty-subject pair.
* **Interactive Drag-and-Drop Cell Swap:** Real-time validation checking room collisions, professor overlap, and floor policy compliance before confirming moves.

### 2. 🕒 Live Real-Time Student Portal (`/student`)
* **Live Campus Clock:** Synchronized with the real-time system clock with ticking seconds and dynamic day indicators.
* **Dynamic Lecture States:** Automatically classifies lectures into `Ongoing` (pulsing indicator), `Upcoming`, or `Completed` based on the current time.
* **Live Attendance Reflection:** 4-second reactive background polling reflects attendance marks submitted by professors in real time.
* **Risk Tiering & Standing:** Dynamic color-coded score cards (Safe >= 75%, At Risk 60-75%, Critical < 60%) with debarment protection alerts.

### 3. 🏛️ Department Head (HOD) Portal (`/hod`)
* **Department Performance & Workload:** Real-time visibility into the official 9 BCA faculty members and 8 curriculum subjects.
* **Leave Endorsements:** Review, approve, or reject faculty leave applications with live substitute allocation.
* **Timetable Oversight:** Inspect full weekly departmental schedules and classroom utilization.

### 4. 👨‍🏫 Faculty Attendance & Teaching Portal (`/teacher`)
* **Live Period Attendance:** One-click attendance submission (`Present`, `Absent`, `Late`) for current sessions.
* **Weekly Teaching Schedule:** Personal slot timetable with room allocations and student section details.

### 5. 👑 Directorate Executive Dashboard (`/principal`)
* **Apex Institutional Governance:** Bird's-eye metrics across students, faculty, room occupancy, and departmental leave rates.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Web** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios |
| **Backend API** | Python 3.11, FastAPI, SQLAlchemy ORM, Pydantic v2, Uvicorn |
| **Database** | SQLite3 (configured with institutional BCA Semester III dataset) |
| **Scheduling Engine** | Custom CSP Backtracking with constraint weights, MRV, and soft heuristics |

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18 or higher)
* **Python** (v3.10 or higher)
* **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/SimarSabharwal/college-erp-system.git
cd college-erp-system
```

### 2. Launch the Backend API
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Interactive API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

### 3. Launch the Frontend Application
```bash
cd ../frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
* Web Portal URL: `http://127.0.0.1:5173`

---

## 🔑 Quick Login Credentials

| Role | Email Address | Password | Focus Area |
|---|---|---|---|
| **College Admin** | `admin@college.edu` | `Admin@123` | Full Timetable Studio, System Controls |
| **HOD (Dr. Mahesh Chaubey)** | `mahesh.chaubey@college.edu` | `Faculty@123` | BCA Dept, Workloads, Leave Endorsements |
| **Faculty (Dr. Mansi Agnihotri)** | `mansi.agnihotri@college.edu` | `Faculty@123` | Operating Systems, Mark Attendance |
| **Director / Principal** | `principal@college.edu` | `Admin@123` | Executive Governance & Institutional Analytics |
| **Student (Simar Sabharwal)** | `0251bca022@college.edu` | `Student@123` | Live Classes, Real-Time Attendance |
| **Student (Aryan Vats)** | `0011bca022@college.edu` | `Student@123` | Student Portal |
| **Student (Prisha Verma)** | `0151bca022@college.edu` | `Student@123` | Student Portal |

---

## 🏢 Institutional Master Data

* **Department:** Department of Computer Applications (BCA)
* **Faculty Roster (9 Members):** Dr. Mahesh Chaubey (HOD), Dr. Mansi Agnihotri, Dr. Daljeet S Bawa, Dr. Megha Sehgal, Dr. Usha Gupta, Dr. Ajay Kumar, Mr. Amit Kumar, Mr. Nripesh Kumar Nrip, Mr. Yashwant Kumar.
* **Curriculum Subjects (8 Subjects):** Java Programming (JP), Lab on Java (JAVA_LAB), Operating Systems (OS), Software Engineering (SE), Statistics (ST), Lab on Oracle (ORACLE_LAB), Start-up Management (SUM), Value-Added Yoga (YOGA).
* **Facilities Catalog:** 4 Approved Computer Labs (107, 103, G01, G03) and 8 Theory Classrooms (Rooms 201 to 208, Second Floor).

---

## 📄 License
This project is licensed under the MIT License.
