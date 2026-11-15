# LPU Adaptive Campus Security Patrol Agent - REST API Specification

This document details all REST API endpoints provided by the FastAPI backend (`http://127.0.0.1:8000`).

---

## 1. System Health

### `GET /api/health`
Returns backend health status, LPU campus center coordinates, and system statistics.

#### Response `200 OK`
```json
{
  "status": "HEALTHY",
  "service": "LPU Adaptive Campus Security Patrol Agent API",
  "timestamp": "2026-11-13T12:00:00Z",
  "campus": "Lovely Professional University (LPU), Punjab, India",
  "coordinates": {
    "lat": 31.2530,
    "lng": 75.7037
  },
  "statistics": {
    "total_zones": 12,
    "total_walkable_edges": 18,
    "active_incidents": 6,
    "plans_generated": 1
  }
}
```

---

## 2. Campus & GIS Topology

### `GET /api/campus/zones`
Retrieves all Lovely Professional University security zones with calculated risk assessments.

- **Query Parameters**:
  - `include_risk` (`bool`, default: `true`): Include 8-factor dynamic risk scores.

#### Response `200 OK`
```json
{
  "zones": [
    {
      "zone_id": "Z01",
      "name": "Main Security Gate 1 & Visitor Access",
      "category": "Entrance",
      "latitude": 31.2553,
      "longitude": 75.7042,
      "base_priority": 9,
      "last_patrol_hours_ago": 1.2,
      "is_restricted": false,
      "restriction_reason": null,
      "is_accessible": true,
      "data_completeness": 0.95,
      "risk_score": 64.5,
      "risk_level": "High",
      "risk_color": "#F97316"
    }
  ],
  "total": 12,
  "last_updated": "2026-11-13T12:00:00Z"
}
```

### `GET /api/campus/zones/geojson`
Returns campus zones formatted as an RFC 7946 compliant GeoJSON `FeatureCollection`.

### `GET /api/campus/zones/{zone_id}`
Returns granular metadata and active incidents for a specific zone.

### `POST /api/campus/zones`
Registers a new verified campus location. Validates that coordinates fall within LPU campus boundaries (`31.2400 <= lat <= 31.2700`, `75.6900 <= lon <= 75.7200`).

### `PUT /api/campus/zones/{zone_id}/restriction`
Applies or removes an operational restriction or safety lockdown on a zone.

- **Query Parameters**:
  - `is_restricted` (`bool`, required)
  - `reason` (`str`, optional)

### `GET /api/campus/graph`
Returns NetworkX topological structure: nodes, verified walkable edges, connectivity status, and density.

### `PUT /api/campus/edges/{edge_id}/status`
Opens or closes an internal campus pedestrian path (e.g., due to construction or alert).

---

## 3. Risk Assessment Engine

### `GET /api/risk/scores`
Returns normalized (0-100) risk evaluations for all zones.

- **Query Parameters**:
  - `current_hour` (`int`, optional, 0-23): Simulated time of day.

### `GET /api/risk/zones/{zone_id}/explain`
Produces an Explainable AI (XAI) breakdown of the top factor contributions for a zone.

### `GET /api/risk/incidents`
Returns recorded campus security incidents.

- **Query Parameters**:
  - `status` (`str`, optional): `ACTIVE`, `INVESTIGATING`, `RESOLVED`.

### `POST /api/risk/incidents`
Reports a new simulated or real campus security event.

---

## 4. Patrol Agent & Human-in-the-Loop Approval

### `POST /api/patrol/plan`
Executes goal-based optimization to generate a priority-reward patrol itinerary within time budget.

- **Query Parameters**:
  - `start_zone_id` (`str`, default: `"Z12"` Security HQ)
  - `end_zone_id` (`str`, default: `"Z12"`)
  - `time_budget_minutes` (`float`, default: `45.0`)
  - `dwell_time_minutes` (`float`, default: `2.0`)
  - `current_hour` (`int`, optional)

### `POST /api/patrol/replan`
Dynamically replans a route after a simulated incident or obstruction and returns before/after deltas.

### `GET /api/patrol/current`
Returns active cached patrol plan.

### `POST /api/patrol/approve`
Allows authorized personnel to APPROVE, REJECT, or mark EXCEPTION. Updates visited zone patrol timestamps on approval.

---

## 5. Scenario Simulator & Evaluation

### `POST /api/scenarios/simulate`
Simulates live campus perturbations (`NEW_INCIDENT`, `PATH_CLOSURE`, `ZONE_LOCKDOWN`, `REDUCED_BUDGET`, `REOPEN_ALL`).

### `POST /api/scenarios/reset`
Restores campus environment to default initial state.

### `GET /api/evaluation/compare`
Executes side-by-side benchmarking: Fixed Round-Robin Schedule vs. Adaptive AI Agent.

### `GET /api/evaluation/algorithms/demo`
Academic search runner: executes BFS, DFS, Dijkstra, and A* between any two zones and returns full search step traces and node expansion counts.
