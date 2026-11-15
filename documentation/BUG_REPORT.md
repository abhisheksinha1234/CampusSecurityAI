# Formal Bug Report & Defect Log
## Adaptive Campus Security Patrol Planning and Coverage Agent
**Project:** Lovely Professional University (LPU) AI Academic Project  
**Date:** 13 November 2026 / 14 April 2026  
**Auditor:** Senior Software Architect & Independent QA Specialist  

---

## 1. Defect Summary Table

| Bug ID | Title | Severity | Component | Status |
|---|---|---|---|---|
| **BUG-001** | Frontend Dashboard Displays Hardcoded Metrics Disconnected from Backend | **CRITICAL** | `frontend/src/App.jsx` | CONFIRMED |
| **BUG-002** | Campus Map Uses Static Building Image with Hardcoded Pixel Coordinates | **CRITICAL** | `frontend/src/components/GoogleMap/CampusMap.jsx` | CONFIRMED |
| **BUG-003** | Frontend Map Ignores 12 Backend Zones and Renders 6 Artificial Mock Zones | **HIGH** | `frontend/src/components/GoogleMap/CampusMap.jsx` | CONFIRMED |
| **BUG-004** | Sidebar Navigation Tabs (`Map View`, `Patrol Plans`, `Incidents`, `Zone Management`, `Settings`) Are Non-Functional | **HIGH** | `frontend/src/App.jsx` | CONFIRMED |
| **BUG-005** | Human Approval Buttons Use Browser `alert()` Instead of Persistent Backend API | **HIGH** | `frontend/src/App.jsx` | CONFIRMED |
| **BUG-006** | Backend REST API Endpoints Completely Lack Authentication and Authorization Checks | **HIGH** | `backend/api/` (All Routers) | CONFIRMED |
| **BUG-007** | Plaintext Password Storage and Credential Leakage via `/api/auth/demo-users` | **MEDIUM** | `backend/api/routes_auth.py` | CONFIRMED |
| **BUG-008** | Gmail OTP 2FA Falls Back to Simulated Response Because Credentials Are Not in `.env` | **MEDIUM** | `backend/api/otp_service.py` | CONFIRMED |
| **BUG-009** | Google Maps JavaScript SDK Inactive Due to Missing API Key | **MEDIUM** | `frontend/src/services/mapService.js` | CONFIRMED |
| **BUG-010** | Route Polyline on Map is Hardcoded SVG Path, Disconnected from Orienteering Plan | **MEDIUM** | `frontend/src/components/GoogleMap/CampusMap.jsx` | CONFIRMED |

---

## 2. Detailed Bug Descriptions

---

### BUG-001: Frontend Dashboard Displays Hardcoded Metrics Disconnected from Backend
- **Severity:** **CRITICAL**
- **Affected File:** `frontend/src/App.jsx` (Lines 370–495)
- **Steps to Reproduce:**
  1. Start backend and frontend.
  2. Log in and view the Dashboard.
  3. Observe "Patrol Coverage Statistics": displays `87% Coverage`, `Covered Zones: 5`, `Remaining Zones: 1`, `Estimated Duration: ~ 38 min`, `Route Distance: ~ 4.8 km`.
  4. Generate a 15-minute patrol plan or trigger an incident simulation on the backend.
  5. Refresh or observe dashboard: the numbers remain frozen at `87%`, `38 min`, and `4.8 km`.
- **Expected Behavior:** Cards should bind dynamically to the active `patrolPlan` object fetched from `apiService.getCurrentPlan()` (e.g., displaying `patrolPlan.priority_coverage_percentage`, `patrolPlan.total_estimated_duration_minutes`, `patrolPlan.total_distance_meters`, and actual stops).
- **Actual Behavior:** Values are static text strings hardcoded inside JSX elements. Real backend calculations are never rendered.
- **Root Cause:** During the UI overhaul to match the visual mockup screenshot, static values from the design mockup were pasted directly into JSX tags without prop-binding to state.
- **Recommended Fix:** Bind all stat cards to `patrolPlan` state properties:
  - `patrolPlan?.priority_coverage_percentage ?? 0`
  - `patrolPlan?.total_estimated_duration_minutes ?? 0`
  - `(patrolPlan?.total_distance_meters / 1000).toFixed(1)`
  - Map `patrolPlan?.stops` to the "Patrol Plan Overview" list items.

---

### BUG-002: Campus Map Uses Static Building Image with Hardcoded Pixel Coordinates
- **Severity:** **CRITICAL**
- **Affected File:** `frontend/src/components/GoogleMap/CampusMap.jsx` (Lines 415–435)
- **Steps to Reproduce:**
  1. Open Dashboard without a Google Maps API key configured.
  2. Inspect the map DOM element.
  3. Observe `<img src="/lpu_campus_bg.jpg" />`.
- **Expected Behavior:** In the absence of Google Maps API credentials, the fallback should be an interactive, dynamically projected vector map using true WGS84 GPS coordinates (`31.2530°N, 75.7045°E`) displaying all verified zones and connections.
- **Actual Behavior:** An aerial photograph of one specific campus building (Admission Block / Plaza) is displayed, with hardcoded pixel coordinates positioned on top of it.
- **Root Cause:** The component relies on a static background photo when `isGoogleMapsReady` is false, assuming fixed pixel positions matching the photo rather than performing GPS-to-canvas coordinate transformation.
- **Recommended Fix:** Implement a true Mercator or equirectangular projection mathematical function `project(lat, lng) -> {x, y}` that projects actual GPS coordinates of all campus zones onto the canvas dynamically.

---

### BUG-003: Frontend Map Ignores 12 Backend Zones and Renders 6 Artificial Mock Zones
- **Severity:** **HIGH**
- **Affected File:** `frontend/src/components/GoogleMap/CampusMap.jsx` (Lines 35–175)
- **Steps to Reproduce:**
  1. Inspect `backend/data/lpu_campus_zones.json`: contains 12 zones (`Z01` to `Z12`).
  2. Inspect `CampusMap.jsx`: defines a local constant `LPU_SECURITY_ZONES` with only 6 zones (`hostel`, `academic`, `library`, `admin`, `innovation`, `sports`).
- **Expected Behavior:** `CampusMap.jsx` should accept the `zones` prop from `App.jsx` and render all 12 zones defined in the backend environment.
- **Actual Behavior:** The `zones` prop passed to `CampusMap` is completely ignored. The map only renders the 6 hardcoded zones.
- **Root Cause:** Developer isolated `CampusMap.jsx` to match the exact labels of the mockup screenshot rather than connecting it to the application's actual data model.
- **Recommended Fix:** Remove the hardcoded `LPU_SECURITY_ZONES` array and render zones dynamically from the `zones` prop.

---

### BUG-004: Sidebar Navigation Tabs Are Non-Functional
- **Severity:** **HIGH**
- **Affected File:** `frontend/src/App.jsx` (Lines 148–164)
- **Steps to Reproduce:**
  1. On the Dashboard, click `Map View`.
  2. Click `Patrol Plans`.
  3. Click `Incidents`.
  4. Click `Zone Management`.
  5. Click `Settings`.
- **Expected Behavior:** Each navigation tab should switch the main view or mount the corresponding management panel (e.g., `PatrolRoutePanel`, `SimulatorPanel`, `ExplainabilityPanel`, zone management table).
- **Actual Behavior:** Only the active blue button styling changes. The dashboard view remains identical. No sub-views, forms, or tables are rendered.
- **Root Cause:** The `onClick` handler only updates the `activeNav` state variable. No conditional rendering (`if (activeNav === 'Map View') ...`) exists in the JSX body.
- **Recommended Fix:** Add conditional view rendering based on `activeNav`:
  - `Dashboard`: Overview grid (Map + Stats + Approval).
  - `Map View`: Expanded full-screen map with edge toggling.
  - `Patrol Plans`: `PatrolRoutePanel` with time budget slider and generator.
  - `Incidents`: `SimulatorPanel` for scenario disruption and dynamic replanning.
  - `Zone Management`: Table to add, edit, or toggle zone restrictions.
  - `Settings`: API key and system configuration form.

---

### BUG-005: Human Approval Buttons Use Browser `alert()` Instead of Persistent Backend API
- **Severity:** **HIGH**
- **Affected File:** `frontend/src/App.jsx` (Lines 91–99)
- **Steps to Reproduce:**
  1. On Dashboard, click `✓ Approve Plan` in the bottom-right card.
  2. Observe a browser alert: *"Patrol Plan Approved and Dispatched to Field Units."*
  3. Inspect backend terminal or `GET /api/patrol/plan/current`: plan status remains `PENDING_REVIEW`.
  4. Refresh the page: approval status is lost.
- **Expected Behavior:** Clicking `✓ Approve Plan` should dispatch `POST /api/patrol/plan/approve` with reviewer name and action, updating the backend state and persisting the approval.
- **Actual Behavior:** The button only triggers a client-side `alert()` and sets a local boolean flag `isPlanApproved`.
- **Root Cause:** Placeholder handler was implemented during UI design without connecting to `apiService.approvePlan()`.
- **Recommended Fix:** Replace `handleApprovePlan` with an asynchronous call to `apiService.approvePlan(patrolPlan.plan_id, currentUser.full_name, 'APPROVE')`.

---

### BUG-006: Backend REST API Endpoints Lack Authentication & Authorization Checks
- **Severity:** **HIGH**
- **Affected Files:** `backend/api/routes_campus.py`, `backend/api/routes_patrol.py`, `backend/api/routes_simulator.py`
- **Steps to Reproduce:**
  1. Open terminal and run:
     `curl -X POST http://127.0.0.1:8000/api/patrol/plan`
  2. The endpoint returns HTTP 200 and generates a plan without requiring an `Authorization: Bearer <token>` header.
- **Expected Behavior:** Sensitive administrative operations (generating patrol plans, approving routes, toggling walkway closures) should require a valid JWT token with appropriate role permissions (`ADMIN` or `PATROL_OFFICER`).
- **Actual Behavior:** All endpoints are completely open and unauthenticated.
- **Root Cause:** FastAPI `Depends(...)` security dependency was omitted from route handlers.
- **Recommended Fix:** Add an authentication dependency that validates the session token and verifies user permissions.

---

### BUG-007: Plaintext Password Storage and Credential Leakage via `/api/auth/demo-users`
- **Severity:** **MEDIUM**
- **Affected File:** `backend/api/routes_auth.py` (Lines 17–64, 196–215)
- **Steps to Reproduce:**
  1. Send `GET http://127.0.0.1:8000/api/auth/demo-users`.
  2. Response contains plaintext passwords: `"password": "lpu@security2026"`.
- **Expected Behavior:** Passwords should be hashed using bcrypt or Argon2, and public demo endpoints should never return password fields.
- **Actual Behavior:** Plaintext passwords are hardcoded in source code and returned by the public API.
- **Root Cause:** Simplified mock authentication designed for viva evaluation without proper security practices.
- **Recommended Fix:** Hash stored passwords and remove `password` from the public `demo-users` response model.

---

### BUG-008: Gmail OTP Falls Back to In-Memory Simulation
- **Severity:** **MEDIUM**
- **Affected Files:** `backend/api/otp_service.py` & `.env`
- **Steps to Reproduce:**
  1. Enter personal email on login page and click "Send OTP".
  2. No email arrives in the inbox.
  3. The OTP appears on screen in the frontend.
- **Expected Behavior:** Real email arrives in recipient's Gmail inbox via SMTP.
- **Actual Behavior:** The backend detects missing `GMAIL_SENDER` and `GMAIL_APP_PASSWORD` environment variables and returns the OTP in the HTTP response body (`demo_otp`).
- **Root Cause:** No `.env` file exists with Google App Password credentials.
- **Recommended Fix:** User must supply valid Gmail credentials in `.env`, or the UI must clearly label this as "Demo Simulation Mode".

---

### BUG-009: Google Maps JavaScript SDK Inactive Due to Missing API Key
- **Severity:** **MEDIUM**
- **Affected File:** `frontend/src/services/mapService.js`
- **Steps to Reproduce:**
  1. Inspect browser console: `[Google Maps] No API key detected. Using Geospatial Vector Canvas mode.`
- **Expected Behavior:** Live Google Maps JavaScript API with satellite imagery and roadmap layers.
- **Actual Behavior:** Application runs in offline fallback mode.
- **Root Cause:** `VITE_GOOGLE_MAPS_API_KEY` is not defined in `.env`.
- **Recommended Fix:** Prompt user to provide a valid Google Cloud Maps API key, or enter it via the in-app key modal.

---

### BUG-010: Route Polyline on Map is Hardcoded SVG Path
- **Severity:** **MEDIUM**
- **Affected File:** `frontend/src/components/GoogleMap/CampusMap.jsx` (Lines 440–460)
- **Steps to Reproduce:**
  1. Inspect the route polyline in `CampusMap.jsx`.
  2. Path is hardcoded: `d="M 470 535 L 335 440 L 340 340 L 450 220 L 700 330 L 740 450 Z"`.
- **Expected Behavior:** Polyline should be generated dynamically from `patrolPlan.stops` coordinates.
- **Actual Behavior:** The polyline is a static SVG shape that never changes when new routes are generated.
- **Root Cause:** Hardcoded during visual mockup implementation.
- **Recommended Fix:** Dynamically construct the SVG path string from `patrolPlan.stops` coordinates.
