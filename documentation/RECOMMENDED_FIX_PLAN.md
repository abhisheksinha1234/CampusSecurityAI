# Recommended Remediation & Fix Plan
## Adaptive Campus Security Patrol Planning and Coverage Agent
**Target System:** Lovely Professional University (LPU) AI Security Agent  
**Date:** 13 November 2026 / 14 April 2026  
**Auditor:** Senior Software Architect & Independent QA Specialist  

---

## 1. Remediation Philosophy

1. **Zero Architectural Rewrite:** The backend architecture (FastAPI, NetworkX, Orienteering Optimizer, Risk Classifier, Rule Engine) is fully functional and mathematically sound. Do NOT replace or rewrite it.
2. **Eliminate All Hardcoding:** Replace every static number (`87%`, `38 min`, `4.8 km`, static zone lists) in `App.jsx` and `CampusMap.jsx` with dynamic data bindings from the backend API.
3. **Connect Frontend to Backend Endpoints:** Wire the existing UI cards, buttons, and modals to their respective `apiService` functions.
4. **Honest Labeling:** Clearly distinguish live Google Maps Platform rendering from the offline geospatial vector canvas. Label simulated incidents and illustrative zones accurately.

---

## 2. Five Most Critical Problems & Responsible Files

### Problem 1: Hardcoded Dashboard Statistics and Plan Overview
- **Responsible File:** `frontend/src/App.jsx` (Lines 340–495)
- **Why It Occurs:** Static mockup strings (`87% Coverage`, `~ 38 min`, `4.8 km`, static 5-stop list) were pasted directly into JSX instead of reading from the `patrolPlan` state object returned by `apiService.getCurrentPlan()`.
- **Impact:** The dashboard shows the exact same numbers regardless of time budget, active incidents, or replanning triggers.

### Problem 2: Campus Map Disconnect (6 Mock Zones on Building Photo vs. 12 Real Campus Zones)
- **Responsible File:** `frontend/src/components/GoogleMap/CampusMap.jsx` (Lines 35–180, 415–490)
- **Why It Occurs:** In offline mode (no Google Maps API key), `CampusMap.jsx` displays an aerial photo of a single building (`/lpu_campus_bg.jpg`) with fixed SVG pixel positions for 6 mock zones (`hostel`, `academic`, etc.), ignoring the backend's 12 zones (`Z01`–`Z12`) and actual NetworkX edges.
- **Impact:** The map is purely decorative and does not reflect real graph nodes, edge closures, or AI route paths.

### Problem 3: Non-Functional Sidebar Navigation Tabs
- **Responsible File:** `frontend/src/App.jsx` (Lines 148–164)
- **Why It Occurs:** The `onClick` handler updates the `activeNav` state string, but no conditional rendering exists in `App.jsx` to mount the corresponding views (`Map View`, `Patrol Plans`, `Incidents`, `Zone Management`, `Settings`).
- **Impact:** 5 out of 7 sidebar navigation items do nothing when clicked.

### Problem 4: Human Approval Buttons Are Decorative (Browser `alert()` Only)
- **Responsible File:** `frontend/src/App.jsx` (Lines 91–99, 520–540)
- **Why It Occurs:** Handlers call `alert('Patrol Plan Approved...')` instead of dispatching `apiService.approvePlan(planId, reviewerName, 'APPROVE')`.
- **Impact:** The plan status is never updated or persisted on the backend; refreshing the page wipes the local state.

### Problem 5: Missing Configuration for External Services (Google Maps API Key & Gmail SMTP)
- **Responsible Files:** `frontend/src/services/mapService.js`, `backend/api/otp_service.py`, `.env`
- **Why It Occurs:** No `.env` file exists in the project root with `VITE_GOOGLE_MAPS_API_KEY`, `GMAIL_SENDER`, and `GMAIL_APP_PASSWORD`.
- **Impact:** Google Maps cannot load live satellite tiles, and Gmail OTP cannot dispatch real emails (falling back to on-screen demo OTP).

---

## 3. Safest Prioritized Order of Fixes

```
+--------------------------------------------------------------------------------+
| Step 1: Dynamic Data Binding in App.jsx (Eliminate Hardcoded Statistics)       |
| - Connect 'Patrol Coverage Statistics' to patrolPlan.priority_coverage_pct     |
| - Connect duration to patrolPlan.total_estimated_duration_minutes             |
| - Connect distance to (patrolPlan.total_distance_meters / 1000).toFixed(1)    |
| - Connect 'Patrol Plan Overview' to patrolPlan.stops.map(...)                  |
| - Connect Risk Distribution chart to live zone risk scores                     |
+--------------------------------------------------------------------------------+
                                       │
                                       ▼
+--------------------------------------------------------------------------------+
| Step 2: Dynamic Geospatial Map Projection (All 12 Real Campus Zones)          |
| - Remove hardcoded LPU_SECURITY_ZONES array from CampusMap.jsx                 |
| - Implement GPS-to-canvas mathematical projection function:                    |
|     project(lat, lng) -> { x, y } using LPU bounding box coordinates          |
| - Dynamically render all 12 backend zones (Z01-Z12) with real risk colors      |
| - Dynamically render all 18 NetworkX walkable edges (open = blue, closed = red)|
| - Dynamically draw the patrol route connecting actual patrolPlan.stops coords  |
+--------------------------------------------------------------------------------+
                                       │
                                       ▼
+--------------------------------------------------------------------------------+
| Step 3: Wire Sidebar Navigation Tabs to Real Operational Views                 |
| - 'Dashboard': Main command overview with dynamic map & stats                  |
| - 'Map View': Full-width interactive map with clickable edge toggling          |
| - 'Patrol Plans': Patrol planning panel (budget slider, start/end hub, trigger)|
| - 'Incidents': Simulator panel (inject incident, fire alarm, path closure)     |
| - 'Zone Management': Zone list with status toggles (lockdown/restriction)     |
| - 'Settings': Google Maps API key & Gmail credentials configuration form       |
+--------------------------------------------------------------------------------+
                                       │
                                       ▼
+--------------------------------------------------------------------------------+
| Step 4: Persistent Human Approval & Replanning Workflows                       |
| - Replace handleApprovePlan with apiService.approvePlan(...)                   |
| - Replace handleRequestChanges with dynamic replan trigger                     |
| - Persist reviewer name, role, and digital audit timestamp                     |
+--------------------------------------------------------------------------------+
                                       │
                                       ▼
+--------------------------------------------------------------------------------+
| Step 5: External Service Credentials Configuration (User Input Required)       |
| - Provide .env file with VITE_GOOGLE_MAPS_API_KEY (if user has Google Cloud key)|
| - Provide GMAIL_SENDER and GMAIL_APP_PASSWORD (if user wants real email OTP)   |
| - Add in-app Settings form so user can configure credentials at runtime        |
+--------------------------------------------------------------------------------+
```

---

## 4. User Inputs Required

The following two items **cannot be generated by the AI** and require explicit input from the user:

1. **Google Maps Platform API Key (Optional for Live Google Maps):**
   - If the user has a Google Cloud account with Maps JavaScript API enabled, they can supply their API key (`AIzaSy...`).
   - If no key is available, the application will use the dynamic GPS-projected vector canvas (Step 2 above), which requires zero billing and works offline.
2. **Gmail Sender Address & Google App Password (Optional for Real Email OTP):**
   - To receive real OTP verification emails in Gmail, the user must supply:
     - `GMAIL_SENDER`: e.g. `your_email@gmail.com`
     - `GMAIL_APP_PASSWORD`: 16-character Google App Password generated from `https://myaccount.google.com/apppasswords`.
   - If not provided, the login system will operate in password mode or transparent demo OTP mode.
3. **Campus Geographical Boundaries (Verification):**
   - Confirm whether the 12 zones defined in `backend/data/lpu_campus_zones.json` (Gate 1, Admin Block 1, Central Library Block 34, Unipolis/Auditorium, Engineering Blocks 32–34, Uni-Mall, Boys Hostels, Girls Hostels, Uni-Hospital, Sports Complex, Command Hub) are the desired locations for your course evaluation.

---

## 5. Explicit Stop Instruction

**In strict compliance with Stage 1 instructions:**
- No application source code has been modified during this audit.
- No files have been deleted.
- No database changes have been performed.
- All findings are documented and awaiting user review and approval before proceeding to implementation.
