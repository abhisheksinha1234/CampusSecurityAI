# Project Audit and Root Cause Analysis
## Adaptive Campus Security Patrol Planning and Coverage Agent
**Target System:** Lovely Professional University (LPU) Campus Security AI  
**Auditor:** Senior Software Architect, Security Engineer & Independent QA Auditor  
**Date:** 13 November 2026 / 14 April 2026  
**Audit Scope:** Full Codebase Inspection, Architectural Verification, Data Flow Analysis, Security Audit  

---

## 1. Executive Summary

This independent audit was initiated following user observations that while the user interface is visually polished, several critical features appear simulated, hardcoded, or disconnected between the React frontend and the FastAPI backend.

### Key Finding:
The Python backend contains **real, mathematically functional AI planning, graph search, and risk assessment logic**. However, during the recent visual redesign to match the dark-blue mockup screenshot, **the React frontend was modified to display static hardcoded numbers and mock strings rather than binding to the live backend API responses**. Furthermore, in the absence of a configured Google Maps API key, the map falls back to a static aerial building photo with hardcoded SVG pixel coordinates rather than dynamically projecting the true 12-zone campus graph.

---

## 2. Codebase & Architectural Inventory

### 2.1 Technology Stack
- **Backend:** Python 3.14, FastAPI 0.115+, Uvicorn, NetworkX 3.4.2, Pydantic v2.
- **Frontend:** React 18.3, Vite 6.4, Tailwind CSS 3.4, Lucide React icons.
- **Data Persistence:** In-memory singleton state (`CampusEnvironment`) initialized from JSON disk files (`backend/data/lpu_campus_zones.json`, `backend/data/lpu_campus_edges.json`, `backend/data/sample_incidents.json`).

### 2.2 Backend Architectural Layers
1. **Environment State (`backend/environment/campus_environment.py`):**
   - Stores 12 campus zones (`Z01` to `Z12`), 18 pedestrian edges (`E01` to `E18`), and incidents.
   - Provides methods for zone restriction, edge status toggling, incident logging, and GeoJSON export.
2. **Graph Topology Layer (`backend/search/graph_builder.py`):**
   - Converts zones and edges into an undirected NetworkX graph with distance and walk-duration weights.
3. **Search Algorithms (`backend/search/bfs_dfs.py`, `backend/search/dijkstra_astar.py`):**
   - Explicit implementations of BFS, DFS, Dijkstra, and A* with Haversine distance heuristic.
4. **Constrained Patrol Optimizer (`backend/search/patrol_optimizer.py`):**
   - Solves the Multi-Goal Orienteering Problem with heuristic priority scoring, time budget constraint satisfaction, and return-to-hub enforcement.
5. **Risk Classification Engine (`backend/risk_engine/risk_classifier.py`):**
   - 8-factor mathematical risk formulation (0-100 score mapped to Low, Medium, High, Critical, Unknown).
6. **Rule Engine (`backend/agent/rules.py`):**
   - Evaluates curfew hours, critical active incidents (mandatory visits), and locked-down zones (exclusion).
7. **Explainable AI (`backend/explanations/explainability_engine.py`):**
   - Synthesizes factor breakdowns and decision rationales.
8. **REST API Routers (`backend/api/`):**
   - `routes_auth.py`, `routes_campus.py`, `routes_risk.py`, `routes_patrol.py`, `routes_simulator.py`, `routes_evaluation.py`.

---

## 3. Deep-Dive Investigation Findings

### Finding A: The Login & Authentication System
**Severity: High**
- **Plaintext Passwords:** In `backend/api/routes_auth.py` (lines 17-64), demo user passwords (`lpu@security2026`, `patrol@lpu`, `lpu@guest`) are stored in plain text inside the `DEMO_USERS` dictionary. No cryptographic hashing (e.g., bcrypt/Argon2) is implemented.
- **Credential Exposure:** The endpoint `GET /api/auth/demo-users` returns usernames and passwords directly over HTTP.
- **Unprotected API Endpoints:** None of the operational API endpoints (`/api/campus/*`, `/api/risk/*`, `/api/patrol/*`, `/api/scenarios/*`) require authentication tokens or enforce permissions. Any client can invoke planning, zone addition, or path closure without a token.
- **Gmail OTP Reality:** In `backend/api/otp_service.py`, real SMTP dispatch via `smtp.gmail.com:465` exists in code. However, because no `.env` file exists with `GMAIL_SENDER` and `GMAIL_APP_PASSWORD`, `has_smtp` evaluates to `False`. The backend returns the generated OTP inside the API response JSON (`demo_otp`), meaning emails are never dispatched unless credentials are provided by the user.

### Finding B: The Campus Map & Geospatial Layer
**Severity: Critical**
- **Building Photograph vs. Google Maps:** In `frontend/src/components/GoogleMap/CampusMap.jsx` (lines 415-430), when Google Maps is not active, the map renders:
  ```html
  <img src="/lpu_campus_bg.jpg" alt="Lovely Professional University Satellite Map" />
  ```
  This file is an aerial photograph of the LPU Block 32/Admission building plaza, not a geographical map of the entire university.
- **Hardcoded SVG Pixel Coordinates:** The 6 zones rendered on this image (`hostel`, `academic`, `library`, `admin`, `innovation`, `sports`) use hardcoded SVG pixel strings (e.g., `svgPolygon: '330,140 580,140 580,240 330,240'` and CSS `left: '45%', top: '27%'`). These positions are manually placed relative to the photo and are disconnected from the backend's real GPS coordinates.
- **Zone Discrepancy (6 vs. 12):** The backend maintains 12 verified zones (`Z01` to `Z12`). `CampusMap.jsx` completely ignores the backend's zones and defines its own hardcoded array of 6 zones with artificial IDs (`hostel`, `academic`, etc.).
- **Route Disconnect:** The route polyline drawn on the map is a hardcoded SVG path (`M 470 535 L 335 440 L 340 340 L 450 220 L 700 330 L 740 450 Z`). It does NOT reflect the route returned by the backend optimizer.
- **Google Maps Status:** Live Google Maps Platform code is present in `CampusMap.jsx` and `mapService.js`, but requires a valid `VITE_GOOGLE_MAPS_API_KEY`. Without it, the map remains in offline image mode.

### Finding C: AI Calculations & Data Flow Disconnect
**Severity: Critical**
- **Hardcoded Dashboard Statistics in `App.jsx`:**
  - In `frontend/src/App.jsx` (lines 370-410), the statistics:
    - `87% Coverage`
    - `Covered Zones: 5`
    - `Remaining Zones: 1`
    - `High-Risk Covered: 100%`
    - `Estimated Duration: ~ 38 min`
    - `Route Distance: ~ 4.8 km`
    are **literal hardcoded JSX strings and values**.
  - In `frontend/src/App.jsx` (lines 425-460), the "Patrol Plan Overview" list:
    - `1. Main Gate – Starting Point`
    - `2. Sports Complex (Low Risk)`
    - `3. Hostel Zone (Low Risk)`
    - `4. Innovation Hub (Critical)`
    - `5. Library Zone (Medium Risk)`
    is a **static hardcoded list**, not populated from the backend's `patrolPlan.stops`.
  - In `frontend/src/App.jsx` (lines 480-495), the "Recommended Patrol Route" card tiles:
    - `Coverage 87%`, `Duration ~ 38 min`, `Distance 4.8 km`, `Priority High`
    are **static hardcoded values**.
- **Backend Disconnect:** Although `App.jsx` fetches `planRes = await apiService.getCurrentPlan()` on line 66, the resulting state (`patrolPlan`) is completely unused in the main dashboard view. The real backend calculations ($2075.2\text{ m}$, $43.7\text{ min}$, 10 stops) are computed on the server but never displayed in the UI.

### Finding D: Sidebar Navigation & Dashboard Controls
**Severity: High**
- **Decorative Sidebar Links:** In `frontend/src/App.jsx` (lines 148-152):
  ```javascript
  onClick={() => {
    setActiveNav(item.name);
    if (item.name === 'Risk Analytics') setIsAlgorithmsOpen(true);
    if (item.name === 'Reports') setIsEvaluationOpen(true);
  }}
  ```
  - Clicking `Dashboard` stays on the dashboard.
  - Clicking `Map View` changes `activeNav` state but renders nothing new.
  - Clicking `Patrol Plans` changes `activeNav` state but renders nothing new.
  - Clicking `Incidents` changes `activeNav` state but renders nothing new.
  - Clicking `Zone Management` changes `activeNav` state but renders nothing new.
  - Clicking `Settings` changes `activeNav` state but renders nothing new.
- **Decorative Approval Buttons:** In `frontend/src/App.jsx` (lines 91-99):
  ```javascript
  const handleApprovePlan = () => {
    setIsPlanApproved(true);
    alert('Patrol Plan Approved and Dispatched to Field Units.');
  };
  const handleRequestChanges = () => {
    setIsPlanApproved(false);
    alert('Plan revision requested...');
  };
  ```
  These handlers trigger browser `alert()` popups. They do NOT call `apiService.approvePlan(...)` and do NOT persist approval status to the backend.

---

## 4. Root Cause Summary

| Concern | Primary Root Cause | Responsible File |
|---|---|---|
| **Hardcoded Patrol Stats (87%, 38m, 4.8km)** | Static strings pasted into `App.jsx` to match UI mockup; API data unmapped. | `frontend/src/App.jsx` (lines 340-495) |
| **Map Uses Photo with Pixel Overlays** | No Google Maps API key; fallback uses building photo with static SVG points. | `frontend/src/components/GoogleMap/CampusMap.jsx` (lines 35-180, 415-490) |
| **Zone Discrepancy (6 UI vs 12 Backend)** | `CampusMap.jsx` defines its own 6 mock zones instead of mapping the 12 backend zones. | `frontend/src/components/GoogleMap/CampusMap.jsx` |
| **Non-Functional Sidebar Navigation** | Click handlers only set state string; no sub-views or panels rendered. | `frontend/src/App.jsx` (lines 148-160) |
| **Approval Buttons Not Persisting** | Handlers call `alert()` instead of `apiService.approvePlan()`. | `frontend/src/App.jsx` (lines 91-99) |
| **Gmail OTP Not Sending Real Emails** | Missing `GMAIL_SENDER` and `GMAIL_APP_PASSWORD` in `.env`. | `backend/api/otp_service.py` & `.env` |
| **Plaintext Passwords & Open APIs** | Mock auth dict in memory; no JWT middleware on backend routes. | `backend/api/routes_auth.py` |
