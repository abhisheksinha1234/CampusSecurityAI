"""
Risk Assessment and Incident Management API Endpoints.
Protected by Authentication Middleware and Role-Based Access Control (RBAC).
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.environment.campus_environment import campus_env
from backend.risk_engine.risk_classifier import RiskClassifier
from backend.risk_engine.incident_evaluator import IncidentEvaluator
from backend.environment.zone_model import IncidentModel
from backend.explanations.explainability_engine import ExplainabilityEngine
from backend.api.auth_middleware import get_current_user, require_role

router = APIRouter(prefix="/api/risk", tags=["Risk Engine"])


@router.get("/scores")
def get_risk_scores(
    current_hour: Optional[int] = None,
    user: dict = Depends(get_current_user)
):
    """Returns calculated 8-factor risk scores and classifications. Requires authentication."""
    if not isinstance(current_hour, int):
        current_hour = None
    zones = campus_env.get_all_zones()
    scores = []
    for z in zones:
        active_incs = campus_env.get_active_incidents(z["zone_id"])
        risk_res = RiskClassifier.evaluate_zone_risk(z, active_incs, current_hour=current_hour)
        scores.append(risk_res)
    return {"risk_evaluations": scores, "total_zones": len(scores)}


@router.get("/zones/{zone_id}/explain")
def explain_zone_risk(zone_id: str, user: dict = Depends(get_current_user)):
    """Provides explainable AI breakdown for a zone's security assessment. Requires authentication."""
    zone = campus_env.get_zone(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found.")

    active_incs = campus_env.get_active_incidents(zone_id)
    risk_res = RiskClassifier.evaluate_zone_risk(zone, active_incs)
    explanation = ExplainabilityEngine.generate_zone_explanation(risk_res)

    return {
        "zone_id": zone_id,
        "zone_name": zone.get("name"),
        "risk_evaluation": risk_res,
        "explanation": explanation,
    }


@router.get("/incidents")
def get_incidents(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Returns campus incidents. Requires authentication."""
    incidents = campus_env.incidents
    if status and isinstance(status, str):
        incidents = [inc for inc in incidents if inc.get("status") == status]
    return {"incidents": incidents, "count": len(incidents)}


@router.post("/incidents")
def report_incident(
    incident: IncidentModel,
    user: dict = Depends(get_current_user),
    _role: dict = Depends(require_role(["ADMIN", "PATROL_OFFICER"])),
):
    """Reports a new campus security incident. Restricted to ADMIN and PATROL_OFFICER."""
    created = campus_env.add_incident(incident.dict())
    return {
        "status": "SUCCESS",
        "message": f"Incident {incident.incident_id} recorded in {incident.zone_name}.",
        "incident": created,
    }
