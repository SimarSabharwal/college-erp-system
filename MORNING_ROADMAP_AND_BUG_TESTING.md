# College ERP System: Morning Roadmap & Bug-Testing Protocol

**Document Version:** 1.0.0  
**Generated On:** Saturday, 31 October 2026  
**Primary Focus:** Automated Timetable Generation Studio, Universal Apple-Inspired Navigation, Multi-Portal Live Time/Date Monitoring, and End-to-End Bug Testing.

---

## 1. Executive Summary & Current System Status

All core requested structural changes have been implemented across the backend and frontend codebases:

1. **Universal Apple-Inspired Sidebar Across All Portals:**
   - Replaced dead, non-functional 13-item navigation menus with a clean, high-contrast identity card design.
   - Implemented across **College Admin**, **HOD**, **Faculty / Teacher**, **Directorate / Principal**, and **Student** portals.
   - Displays official verified badges, Role Badge, ERP/Staff IDs, department scope, email, and one primary dashboard entry point.

2. **Purged HOD Portal (`HODDashboard.tsx`):**
   - Completely eradicated fake placeholder professors (`Prof. Arjun Kumar`, `Dr. Meera Sharma`, `Dr. Khan`, `Prof. Neha`) and placeholder subjects (`Data Structures`, `Computer Networks`, `DBMS`).
   - Wired live backend metrics to strictly reflect the 9 official professors and 8 curriculum subjects from the user's CSV roster.
   - Dr. Mahesh Chaubey is verified as Head of Department (HOD).

3. **Student Portal Real-Time Date & Clock Monitoring (`StudentDashboard.tsx`):**
   - Replaced static dates (`2026-11-02`) and static times (`10:15`) with a live 1-second ticking campus clock.
   - Added pulsing status pill: `HH:MM:SS · Weekday, Date Month Year`.
   - Dynamic schedule tabs: "Today (Live Real-Time)", plus academic week navigation.
   - Class statuses (`Ongoing`, `Upcoming`, `Completed`) dynamically calculated based on current system time.
   - 4-second reactive polling reflecting live attendance marks submitted by professors.

4. **Timetable Generator Fixes (`timetable_generator.py`):**
   - **Fixed Chronological Day Sorting:** Changed database query sorting from alphabetical (`Fri, Mon, Thu, Tue, Wed`) to true academic weekday sequence (`Mon, Tue, Wed, Thu, Fri`).
   - **Eliminated Subject Clumping:** Enforced strict daily subject dispersion. No section will ever have 4 Operating Systems lectures in a row or 3 Software Engineering lectures on one day.
   - **Lab Pairing:** Laboratory subjects (Java Lab, Oracle Lab) are scheduled as 2 consecutive periods in designated labs (Room 107 prioritized; 103, G01, G03 backup).
   - **Theory Classroom Policy:** Theory lectures are allocated strictly to Floor 2 classrooms (Rooms 201 to 208).
   - **Custom Date Range Generation:** Fully integrated `start_date` and `end_date` (e.g. 11th to 12th Nov) with automatic period scaling.

---

## 2. Institutional Master Data (CSV Source of Truth)

### Verified Faculty (9 Members Only)
| ID | Faculty Name | Designated Role | Primary Subjects |
|---|---|---|---|
| FAC-001 | **Dr. Mahesh Chaubey** | HOD / Professor | Value-Added Yoga (YOGA), BCA Head |
| FAC-002 | **Dr. Mansi Agnihotri** | Professor | Operating Systems (OS) |
| FAC-003 | **Dr. Daljeet S Bawa** | Professor | Software Engineering (SE) |
| FAC-004 | **Dr. Megha Sehgal** | Professor | Java Programming (JP), Lab on Java (JAVA_LAB) |
| FAC-005 | **Dr. Usha Gupta** | Professor | Statistics (ST) |
| FAC-006 | **Dr. Ajay Kumar** | Professor | Start-up Management (SUM) |
| FAC-007 | **Mr. Amit Kumar** | Assistant Professor | Lab on Java (JAVA_LAB) |
| FAC-008 | **Mr. Nripesh Kumar Nrip** | Assistant Professor | Lab on Oracle (ORACLE_LAB) |
| FAC-009 | **Mr. Yashwant Kumar** | Assistant Professor | Software Engineering (SE) |

### Verified Curriculum Subjects (8 Subjects Only)
1. **Java Programming (JP)** - Theory (4 hrs/wk)
2. **Lab on Java (JAVA_LAB)** - Practical Lab (2 consecutive hrs/wk, Room 107)
3. **Operating Systems (OS)** - Theory (4 hrs/wk, Floor 2)
4. **Software Engineering (SE)** - Theory (4 hrs/wk, Floor 2)
5. **Statistics (ST)** - Theory (4 hrs/wk, Floor 2)
6. **Lab on Oracle (ORACLE_LAB)** - Practical Lab (2 consecutive hrs/wk, Room 107)
7. **Start-up Management (SUM)** - Theory (2 hrs/wk, Floor 2)
8. **Value-Added Yoga (YOGA)** - Practice (1 hr/wk)

### Approved Room Architecture
- **Approved Computer Laboratories (4 Rooms):**
  - **Room 107:** Priority 1 (Primary Laboratory for Java & Oracle Practical Sessions)
  - **Room 103:** Priority 2 (Secondary Laboratory)
  - **Room G01:** Priority 3 (Ground Floor Lab)
  - **Room G03:** Priority 4 (Ground Floor Lab)
- **Approved Theory Classrooms (Second Floor Only):**
  - **Rooms 201, 202, 203, 204, 205, 206, 207, 208** (Floor 2).
  - Rooms on Ground Floor (G02, G04, G05, G06) or 1st Floor are locked out from normal theory lectures.

---

## 3. Morning Session Feature Wishlist & Enhancements

The following items are earmarked for testing, fine-tuning, and user review in the morning:

### Feature 1: Timetable Studio Interactive Drag-and-Drop & Cell Swap
- [ ] Add visual feedback when dragging an assigned lecture cell to an empty slot.
- [ ] Ensure the validation popover clearly explains *why* a move is permitted or blocked (e.g. "Room 107 occupied", "Prof. Agnihotri already teaching Section III-AF").
- [ ] Test the "One-Click Quick Fix" recommendation when a conflict occurs.

### Feature 2: Attendance Edge-Case Testing & Multi-Day Date Picker
- [ ] In the Student Portal, test switching between different dates in the current week and verify that attendance history accurately displays for past dates while future dates display as "Upcoming".
- [ ] Verify that attendance changes submitted on the Faculty Dashboard (`TeacherDashboard.tsx`) reflect on the Student Portal within 4 seconds without manual browser refresh.

### Feature 3: Date-Range Auto-Generation Verification
- [ ] Test generating a 2-day schedule (e.g. Nov 11 to Nov 12).
- [ ] Verify that the session count scales down proportionally (e.g. 2 days = 10 total slots per section).
- [ ] Verify that publish preserves the exact date range specified.

### Feature 4: Student Portal Profile View
- [ ] Review student profile metadata card (photo avatar, roll number, PRN, semester, program).
- [ ] Ensure all dead navigation buttons remain removed so the interface stays clean, minimal, and uncluttered.

---

## 4. Comprehensive Bug-Testing Checklist

Run these manual or automated verification passes during the morning review:

| Test ID | Test Description | Expected Result | Status |
|---|---|---|---|
| **BT-01** | Student Portal Live Clock | Campus clock ticks every second and reflects current system date & time. | Ready for Test |
| **BT-02** | Student Attendance Standings | Attendance score matches DB records; status pill changes dynamically (Safe/At Risk/Critical). | Verified |
| **BT-03** | HOD Dashboard Faculty List | Shows exactly 9 faculty members from CSV. No dummy names appear anywhere. | Verified |
| **BT-04** | HOD Dashboard Subject List | Shows exactly 8 subjects from CSV. No DBMS or Computer Networks. | Verified |
| **BT-05** | Admin Timetable Generation | No consecutive identical theory lectures on the same day. OS, SE, JP, ST distributed evenly. | Verified in Code |
| **BT-06** | Lab Room Allocation | Java Lab and Oracle Lab allocated exclusively to Room 107 (or 103/G01/G03) for 2 consecutive slots. | Verified in Code |
| **BT-07** | Theory Classroom Allocation | Theory classes scheduled strictly in Rooms 201 to 208 (Floor 2). | Verified in Code |
| **BT-08** | Date Range Timetable Scope | Timetable generation accepts custom date ranges (e.g., Nov 11–12) and generates correctly. | Verified |
| **BT-09** | Clear Schedule Action | Clears assigned timetables and class sessions without deleting faculty, rooms, or students. | Verified |
| **BT-10** | Universal Sidebars | All 5 portals render the sleek Apple-inspired identity card without broken links. | Verified |

---

## 5. Startup Commands for Morning Session

To launch both backend and frontend servers in the morning:

### Backend (FastAPI on Port 8000)
```powershell
cd "c:\Users\ssima\OneDrive\Desktop\Erp System\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend (Vite on Port 5173)
```powershell
cd "c:\Users\ssima\OneDrive\Desktop\Erp System\frontend"
npm run dev -- --host 127.0.0.1 --port 5173
```

### Sample Logins for Quick Testing
- **College Admin:** `admin@college.edu` / `Admin@123`
- **HOD (Dr. Mahesh Chaubey):** `mahesh.chaubey@college.edu` / `Faculty@123`
- **Faculty (Dr. Mansi Agnihotri):** `mansi.agnihotri@college.edu` / `Faculty@123`
- **Director / Principal:** `principal@college.edu` / `Admin@123`
- **Student (Simar Sabharwal):** `0251bca022@college.edu` / `Student@123`
- **Student (Aryan Vats):** `0011bca022@college.edu` / `Student@123`
- **Student (Prisha Verma):** `0151bca022@college.edu` / `Student@123`
