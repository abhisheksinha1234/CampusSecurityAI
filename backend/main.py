"""
Adaptive Campus Security Patrol Planning and Coverage Agent - Backend Main Entrypoint.
Lovely Professional University (LPU) AI Academic Project.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from datetime import datetime, timezone
from pathlib import Path
import os

from backend.api.routes_campus import router as campus_router
from backend.api.routes_risk import router as risk_router
from backend.api.routes_patrol import router as patrol_router, patrol_agent
from backend.api.routes_simulator import router as simulator_router
from backend.api.routes_evaluation import router as evaluation_router
from backend.api.routes_auth import router as auth_router
from backend.environment.campus_environment import campus_env

# ---------------------------------------------------------------------------
# Resolve paths robustly using the project root (parent of this file's dir)
# ---------------------------------------------------------------------------
# This file: backend/main.py  →  backend/  →  project root
BACKEND_DIR = Path(__file__).resolve().parent          # .../CampusSecurityAI/backend
PROJECT_ROOT = BACKEND_DIR.parent                       # .../CampusSecurityAI
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"      # .../frontend/dist

app = FastAPI(
    title="LPU Adaptive Campus Security Patrol Planning Agent",
    description=(
        "Real LPU Campus Map Integration with Goal-Based AI Patrol Planning, "
        "NetworkX Graph Reasoning, and Explainable AI."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS – allow Vite dev server (port 5173) and same-origin (port 8000)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Register all API routers FIRST (must come before static-file catch-all)
# ---------------------------------------------------------------------------
app.include_router(auth_router)
app.include_router(campus_router)
app.include_router(risk_router)
app.include_router(patrol_router)
app.include_router(simulator_router)
app.include_router(evaluation_router)


# ---------------------------------------------------------------------------
# Health-check endpoint
# ---------------------------------------------------------------------------
@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint providing backend status and statistics."""
    return {
        "status": "HEALTHY",
        "service": "LPU Adaptive Campus Security Patrol Agent API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "campus": "Lovely Professional University (LPU), Punjab, India",
        "coordinates": {"lat": 31.2530, "lng": 75.7037},
        "frontend_dist": str(FRONTEND_DIST),
        "frontend_built": FRONTEND_DIST.exists(),
        "statistics": {
            "total_zones": len(campus_env.zones),
            "total_walkable_edges": len(campus_env.edges),
            "active_incidents": len(campus_env.get_active_incidents()),
            "plans_generated": len(patrol_agent.plan_history),
        },
    }


# ---------------------------------------------------------------------------
# Startup event
# ---------------------------------------------------------------------------
@app.on_event("startup")
def startup_event():
    """Initializes and pre-computes default campus patrol plan."""
    print("==================================================================")
    print(" [LPU SECURITY AI] Initializing Campus Patrol Planning Engine...")
    print(f" Project root   : {PROJECT_ROOT}")
    print(f" Frontend dist  : {FRONTEND_DIST}  (exists={FRONTEND_DIST.exists()})")
    print(f" Loaded {len(campus_env.zones)} campus zones and {len(campus_env.edges)} verified pedestrian edges.")
    print(" Initializing default goal-based patrol plan...")
    plan = patrol_agent.plan_patrol(
        start_zone_id="Z12", end_zone_id="Z12", time_budget_minutes=45.0
    )
    print(
        f" Initial Plan Generated: {plan['plan_id']} | "
        f"Stops: {len(plan['stops'])} | "
        f"Distance: {plan['total_distance_meters']}m"
    )
    print(" System Ready.")
    print("==================================================================")


# ---------------------------------------------------------------------------
# Favicon – prevent 404 noise in logs
# ---------------------------------------------------------------------------
@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    fav = FRONTEND_DIST / "favicon.ico"
    if fav.exists():
        return FileResponse(str(fav))
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Serve built React frontend
# ---------------------------------------------------------------------------
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():

    # Mount /assets → dist/assets  (hashed JS/CSS chunks)
    _assets_dir = FRONTEND_DIST / "assets"
    if _assets_dir.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=str(_assets_dir)),
            name="static-assets",
        )

    # Mount the WHOLE dist directory at /static so every file in dist
    # (including lpu_campus_bg.jpg) is reachable by its filename.
    # e.g.  GET /lpu_campus_bg.jpg  →  dist/lpu_campus_bg.jpg
    app.mount(
        "/static",
        StaticFiles(directory=str(FRONTEND_DIST)),
        name="static-dist",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        """
        Catch-all SPA handler.
        1. If the requested file exists literally in dist/ → serve it.
        2. Otherwise → serve index.html (React Router handles the route).
        """
        # Try the file as-is in dist/
        target = FRONTEND_DIST / full_path
        if target.exists() and target.is_file():
            return FileResponse(str(target))
        # Fallback: return index.html for client-side routing
        return FileResponse(str(FRONTEND_DIST / "index.html"))

else:
    # Fallback root info when frontend is NOT built yet
    @app.get("/")
    def root_info():
        return {
            "message": "LPU Campus Security AI Backend API is running.",
            "campus": "Lovely Professional University (LPU), Punjab, India",
            "api_docs": "/docs",
            "health_check": "/api/health",
            "frontend_dev_server": "http://localhost:5173",
            "note": "Run 'npm run build' inside frontend/ to enable the built UI.",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
