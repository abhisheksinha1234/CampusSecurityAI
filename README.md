# Adaptive Campus Security Patrol Planning and Coverage Agent
## Real Lovely Professional University (LPU) Campus Map Integration with Google Maps Platform

An explainable, goal-based artificial intelligence system for automated, risk-adaptive campus security patrol planning. The system combines real geospatial visualization of **Lovely Professional University (Phagwara, Punjab, India)** via Google Maps Platform with Python-powered graph reasoning, multi-factor risk assessment, and dynamic constrained route optimization.

Developed as an academic project for the **AI Foundation** course at Lovely Professional University.

---

## 1. Key Capabilities & Technical Highlights

1. **Real Campus Geospatial Visualization**:
   - Georeferenced to Lovely Professional University (NH-44 Phagwara: `31.2530°N, 75.7037°E`).
   - Powered by **Google Maps JavaScript API** supporting Satellite, Roadmap, and Hybrid layers.
   - Interactive SVG vector overlays with risk-colored nodes, halos, and geodesic patrol polylines.
   - Click-to-pin interface allowing security officers to add new verified campus zones on the fly.
   - Built-in graceful offline fallback (Geospatial Vector Canvas) if an API key is not configured.

2. **Topological Pedestrian Graph (NetworkX)**:
   - Discrete graph representation $G=(V, E)$ decoupled from public vehicular routing.
   - 12 primary verified LPU campus security sectors as nodes with real coordinates.
   - 18 verified walkable campus pedestrian corridors with geodesic weights (Haversine formula).
   - Dynamic path closure and security restriction toggling.

3. **8-Factor Explainable Risk Engine**:
   - Deterministic, auditable multi-factor weighted scoring model ($0$ to $100$):
     * *Historical Incidents* ($15\%$)
     * *Active Incident Severity* ($25\%$)
     * *Patrol Neglect / Time Elapsed* ($20\%$)
     * *Base Facility Priority* ($15\%$)
     * *Time of Day Vulnerability* ($10\%$)
     * *Crowd Congestion Pressure* ($5\%$)
     * *Active Alerts & Weather Hazards* ($10\%$)
     * *Sensor Data Completeness Factor*
   - Categorization: **Low** (Green), **Medium** (Yellow), **High** (Orange), **Critical** (Red), **Unknown** (Gray).

4. **Goal-Based Intelligent Agent & Orienteering Planner**:
   - Formulates patrol planning as a **Priority-Reward Orienteering Problem** under a finite time budget $T_{\max}$ (e.g. 45 mins).
   - Solved via a hybrid **Greedy Priority Insertion** algorithm with **2-opt local search** path refinement over Dijkstra-calculated all-pairs shortest paths.
   - Enforces operational constraints: time limits, closed walkways, and safety lockdowns.

5. **Search Algorithm Benchmark Suite**:
   - Explicit academic implementations of **BFS**, **DFS**, **Dijkstra's Algorithm**, and **A\* Search**.
   - Admissible, consistent **Haversine Distance Heuristic** for A* navigation.
   - Traversal traces, node expansion metrics, and academic comparison for viva evaluation.

6. **Dynamic Campus Scenario Simulator**:
   - Simulates real-time campus disruptions: crowd surges at Uni-Mall, night curfew breaches at hostels, path closures, and facility lockdowns.
   - Event-driven automatic replanning with plain-English before-and-after change narratives.

7. **Human-in-the-Loop (HITL) Workflow**:
   - Security supervisor decision support: **Approve**, **Reject**, or **Log Exception**.
   - Audit trail of approved patrol dispatches with timestamped personnel logging.

8. **Fixed-Schedule Baseline Benchmark**:
   - Side-by-side comparison between static round-robin patrol schedules and the adaptive AI planner.
   - Measures high-risk zone coverage gains, path obstruction avoidance, and execution latency ($<5\text{ ms}$).

---

## 2. System Architecture

```
CampusSecurityAI/
│
├── frontend/                                # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── GoogleMap/                   # Live Google Maps & Vector Canvas
│   │   │   ├── RiskDashboard/               # Real-time KPIs & Risk Cards
│   │   │   ├── PatrolRoute/                 # Turn-by-Turn Route Planner & Approval
│   │   │   ├── ScenarioSimulator/           # Dynamic Incident & Path Closure Simulator
│   │   │   ├── Explainability/              # 8-Factor XAI Reasoning Panel
│   │   │   ├── Evaluation/                  # Baseline Comparison Modal
│   │   │   └── AlgorithmsDemo/              # BFS, DFS, Dijkstra, A* Runner
│   │   ├── services/
│   │   │   ├── apiService.js                # REST client for FastAPI backend
│   │   │   └── mapService.js                # Google Maps JS SDK Loader
│   │   ├── App.jsx                          # Main Dashboard Application Shell
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                                 # Python FastAPI Intelligence Engine
│   ├── api/                                 # REST Endpoints (/campus, /risk, /patrol, /simulator, /evaluation)
│   ├── environment/                         # LPU Campus Environment State & Pydantic Models
│   ├── geospatial/                          # Haversine Distance, GeoJSON Serializers & Coordinate Validation
│   ├── risk_engine/                         # 8-Factor Deterministic Risk Engine & Incident Aggregator
│   ├── agent/                               # Goal-Based Agent Loop & Rule Engine
│   ├── search/                              # BFS, DFS, Dijkstra, A*, and Orienteering Tour Optimizer
│   ├── constraints/                         # Budget, Closed Path, and Safety Validator
│   ├── explanations/                        # Explainable AI (XAI) Natural Language Generator
│   ├── evaluation/                          # Fixed Baseline vs. Adaptive Agent Benchmarking
│   ├── data/                                # Verified LPU Campus Zones, Edges & Incidents JSON
│   ├── main.py                              # FastAPI Application Entrypoint
│   └── requirements.txt
│
├── tests/                                   # Full Unit & Integration Test Suite (19 tests)
├── documentation/
│   ├── API_DOCUMENTATION.md                 # Detailed Endpoint Request/Response Specs
│   └── VIVA_PREPARATION_QUESTIONS.md        # 38 Comprehensive Viva Voce Questions & Answers
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Installation & Setup

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ & npm (Tested on Node v26)

### 3.1 Backend Setup
```bash
# 1. Open a terminal in the project root directory
cd CampusSecurityAI

# 2. (Optional) Create and activate a Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start the FastAPI backend server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API documentation will be accessible at:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`
- **Health Check**: `http://127.0.0.1:8000/api/health`

---

### 3.2 Frontend Setup
```bash
# 1. In a separate terminal, navigate to the frontend folder
cd CampusSecurityAI/frontend

# 2. Install dependencies
npm install

# 3. (Optional) Configure Google Maps API Key
# Copy .env.example to .env
cp .env.example .env
# Edit .env and paste your Google Maps Browser Key:
# VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

# 4. Start the Vite development server
npm run dev
```
Open your browser and navigate to: `http://localhost:5173/`

> **Note on Google Maps Key**: If you run without a Google Maps key, the application automatically runs in **Integrated Geospatial Vector Canvas mode** using real projected LPU coordinates, allowing full evaluation without any third-party dependencies.

---

## 4. Google Maps Platform Setup Guide

To enable live Google satellite imagery:
1. Visit the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project named `LPU-Campus-Security-AI`.
3. Navigate to **APIs & Services > Library** and enable **Maps JavaScript API**.
4. Navigate to **APIs & Services > Credentials** and create an **API Key**.
5. Click **Edit API Key**:
   - Under **Set application restrictions**, choose **Websites (HTTP referrers)**.
   - Add referrer: `http://localhost:5173/*` (and your deployed domain).
   - Under **API restrictions**, select **Restrict key** and check only **Maps JavaScript API**.
6. Set a billing alert (e.g., $1.00 threshold) in Billing settings to ensure zero unintended charges.
7. Paste the key into `CampusSecurityAI/frontend/.env`:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourActualKeyHere
   ```

---

## 5. Verification & Test Suite

The project includes an automated test suite covering search algorithms, risk evaluation, patrol agent planning, constraint validation, and REST API handlers.

```bash
# Run all tests from project root
python -m unittest discover tests
```

Expected output:
```
Ran 19 tests in 0.054s

OK
```

---

## 6. Primary LPU Campus Zones Mapped

| Zone ID | Facility Name | Category | Base Priority | Typical Role |
| :---: | :--- | :---: | :---: | :--- |
| **Z01** | Main Security Gate 1 & Visitor Entry | Entrance | 9/10 | Access control, vehicle screening |
| **Z02** | Central Administration (Block 1) | Administration | 8/10 | Executive offices, records, reception |
| **Z03** | Engineering Complex (Blocks 32–34) | Academic | 7/10 | Computer science labs, high student flow |
| **Z04** | Uni-Mall & Commercial Square | Commercial | 9/10 | Food courts, retail, peak evening crowds |
| **Z05** | Central Bus Terminus & Parking | Transit | 6/10 | Fleet movements, perimeter boundary |
| **Z06** | Central Library (Block 34) | Library | 7/10 | 24/7 study areas, quiet zone |
| **Z07** | Shanti Devi Mittal Auditorium & Unipolis | Assembly | 8/10 | Amphitheatre, major convocations |
| **Z08** | Boys Hostel Cluster (BH-1 to BH-4) | Hostel | 8/10 | High residential density, night curfew |
| **Z09** | Girls Hostel Cluster (GH-1 to GH-3) | Hostel | 9/10 | Secure perimeter, biometric access |
| **Z10** | Uni-Hospital (Baldev Raj Mittal Healthcare) | Medical | 9/10 | 24/7 trauma care, emergency bay |
| **Z11** | Indoor Stadium & Olympic Sports Complex | Sports | 6/10 | Athletic tracks, gymnasium |
| **Z12** | Security Command HQ & Dispatch Office | Administration | 10/10 | Central staging & patrol starting base |

---

## 7. Viva Voce Preparation

For examination and viva preparation, refer to:
- [`documentation/VIVA_PREPARATION_QUESTIONS.md`](documentation/VIVA_PREPARATION_QUESTIONS.md) - Contains 38 categorized questions and comprehensive answers spanning graph theory, heuristic search, agent architectures, Google Maps compliance, and ethical AI.
- [`documentation/API_DOCUMENTATION.md`](documentation/API_DOCUMENTATION.md) - Contains full REST endpoint parameters and response schemas.

---

## 8. Academic Integrity & Ethical AI Notice

- **Decision Support Only**: This application is an academic decision-support prototype and does not perform autonomous dispatch or physical intervention.
- **Privacy Protection**: The system does not collect personal student data, biometric identifiers, or individual tracking information.
- **Synthetic Data**: All historical and simulated incident entries are synthetic demonstrations created for academic evaluation.
- **Google Maps Compliance**: The application respects Google Maps Platform Terms of Service, avoiding map tile scraping or unauthorized data harvesting.
